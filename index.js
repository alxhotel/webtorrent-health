const TIMEOUT = 1000

// `bittorrent-tracker` (>=10) and `parse-torrent` (>=10) are ESM-only, so they
// cannot be `require`d. Load them lazily with dynamic `import()` instead.
let depsPromise = null
const loadDeps = function () {
  if (!depsPromise) {
    depsPromise = Promise.all([
      import('bittorrent-tracker'),
      import('parse-torrent')
    ]).then(function ([tracker, parse]) {
      return { ClientTracker: tracker.default, parseTorrent: parse.default }
    }).catch(function (err) {
      depsPromise = null
      throw err
    })
  }
  return depsPromise
}

/**
 * Webtorrent health checker.
 *
 * Get health info about a webtorrent file or magnet link.
 *
 * @param {Object} torrentId                    torrentId object
 * @param {Array<string>} opts.trackers         trackers list
 * @param {Array<string>} opts.blacklist        trackers blacklist
 * @param {number} opts.timeout                 timeout for each request to tracker
 * @param {function} cb
 */
const WebtorrentHealth = function (torrentId, opts, cb) {
  return new Promise(function (resolve, reject) {
    let callback = cb || opts
    if (!callback || typeof callback !== 'function') {
      callback = function (err, data) {
        if (err) return reject(err)
        return resolve(data)
      }
    }

    if (!torrentId) return callback(new Error('A `torrentId` is required'))

    if (typeof opts === 'function' || !opts) {
      // 'opts' can be 'cb'
      cb = opts
      opts = { trackers: [], blacklist: [] }
    } else if (typeof opts === 'object') {
      // Use default values
      if (!opts.trackers || !Array.isArray(opts.trackers)) opts.trackers = []
      if (!opts.blacklist || !Array.isArray(opts.blacklist)) opts.blacklist = []
      if (!opts.timeout || typeof opts.timeout !== 'number' || opts.timeout < 0) opts.timeout = TIMEOUT
    }

    loadDeps().then(function ({ ClientTracker, parseTorrent }) {
      // Get info (`parseTorrent` is async since parse-torrent v10)
      return Promise.resolve()
        .then(function () { return parseTorrent(torrentId) })
        .catch(function () { return null })
        .then(function (parsedTorrent) {
          return { ClientTracker, parsedTorrent }
        })
    }).then(function ({ ClientTracker, parsedTorrent }) {
      scrapeAll(ClientTracker, parsedTorrent)
    }, callback)

    function scrapeAll (ClientTracker, parsedTorrent) {
      if (!parsedTorrent || !parsedTorrent.infoHash) return callback(new Error('Invalid torrent file or magnet link'))

      // Merge torrent trackers with custom ones into 'trackers' array
      ;(parsedTorrent.announce || []).forEach(function (tracker) {
        if (!opts.blacklist.some(function (regex) {
          if (typeof regex === 'string') regex = new RegExp(regex)
          return regex.test(tracker)
        })) if (opts.trackers.indexOf(tracker) === -1) opts.trackers.push(tracker)
      })

      if (opts.trackers.length === 0) return callback(new Error('No trackers found'))

      let len = opts.trackers.length
      let sumSeeds = 0
      let sumPeers = 0
      let total = 0
      const aux = []
      opts.trackers.forEach(function (tracker) {
      // Send data function
        const sendData = function () {
          if (len === 0) {
          // Dont divide by zero
            if (total === 0) total = 1

            // Return data
            callback(null, {
              seeds: Math.round(sumSeeds / total),
              peers: Math.round(sumPeers / total),
              extra: aux
            })
          }
        }

        // Setup our own timeout
        let canceled = false
        const ms = opts.timeout || TIMEOUT
        let timeout = setTimeout(function () {
          canceled = true
          timeout = null
          len -= 1
          // Save error
          aux.push({
            tracker,
            error: 'Timed out'
          })
          // Last tracker
          sendData()
        }, ms)

        const startTime = Date.now()
        const onResult = function (err, result) {
          if (canceled) return
          canceled = true

          clearTimeout(timeout)
          len -= 1

          if (!err) {
            // Sum data
            sumSeeds += result.complete
            sumPeers += result.incomplete
            total++

            // Save data
            aux.push({
              tracker: result.announce,
              seeds: result.complete,
              peers: result.incomplete,
              downloads: result.downloaded,
              response_time: Date.now() - startTime
            })
          } else {
            // Save client error
            aux.push({
              tracker,
              error: err.message
            })
          }

          // Last tracker
          sendData()
        }

        // Scrape tracker (it can throw synchronously, e.g. on a bad announce URL)
        try {
          ClientTracker.scrape({ announce: tracker, infoHash: parsedTorrent.infoHash, wrtc: true }, onResult)
        } catch (err) {
          onResult(err)
        }
      })
    }
  })
}

module.exports = WebtorrentHealth

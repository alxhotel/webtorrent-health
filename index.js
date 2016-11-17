var ClientTracker = require('bittorrent-tracker')
var parseTorrent = require('parse-torrent')

var TIMEOUT = 1000

/**
 * Webtorrent health checker.
 *
 * Get health info about a webtorrent file or magnet link.
 *
 * @param {Object} torrentId                     torrentId object
 * @param {Array<string>} opts.trackers         trackers list
 * @param {number} opts.timeout                  timeout for each request to tracker
 * @param {function} cb
 */
var WebtorrentHealth = function (torrentId, opts, cb) {
  return new Promise(function (resolve, reject) {
    var callback = cb || opts;
    if (!callback || typeof callback !== 'function') {
      callback = function (err, data) {
        if (err) return reject(err);
        return resolve(data);
      }
    }

    if (!torrentId) return callback(new Error('A `torrentId` is required'))

    if (typeof opts === 'function' || !opts) {
     // 'opts' can be 'cb'
      cb = opts
      opts = { trackers: [] }
    } else if (typeof opts === 'object') {
      // Use default values
      if (!opts.trackers || !Array.isArray(opts.trackers)) opts.trackers = []
      if (!opts.blacklist || !Array.isArray(opts.blacklist)) opts.blacklist = []
      if (!opts.timeout || typeof opts.timeout !== 'number' || opts.timeout < 0) opts.timeout = TIMEOUT
    }

    // Get info
    var parsedTorrent
    try {
      parsedTorrent = parseTorrent(torrentId)
    } catch (err) {}

    if (!parsedTorrent) return callback(new Error('Invalid torrent file or magnet link'))

    // Merge torrent trackers with custom ones into 'trackers' array
    parsedTorrent.announce.forEach(function (tracker) {
      if (opts.trackers.indexOf(tracker) === -1 && opts.blacklist.indexOf(tracker) === -1) opts.trackers.push(tracker)
    })

    if (opts.trackers.length === 0) return callback(new Error('No trackers found'))

    var len = opts.trackers.length
    var sumSeeds = 0
    var sumPeers = 0
    var total = 0
    var aux = []
    opts.trackers.forEach(function (tracker) {
      // Send data function
      var sendData = function () {
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
      var canceled = false
      var ms = opts.timeout || TIMEOUT
      var timeout = setTimeout(function () {
        canceled = true
        timeout = null
        len -= 1
        // Save error
        aux.push({
          tracker: tracker,
          error: 'Timed out'
        })
        // Last tracker
        sendData()
      }, ms)

      var startTime = Date.now()
      // Scrape tracker
      ClientTracker.scrape({ announce: tracker, infoHash: parsedTorrent.infoHash, wrtc: true }, function (err, result) {
        if (canceled) return

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
            tracker: tracker,
            error: err.message
          })
        }

        // Last tracker
        sendData()
      })
    })
  })
}

module.exports = WebtorrentHealth

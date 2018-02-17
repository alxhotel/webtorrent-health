# webtorrent-health

[![NPM Version][webtorrent-health-ni]][webtorrent-health-nu]
[![Build Status][webtorrent-health-ti]][webtorrent-health-tu]
[![Dependency Status][webtorrent-health-di]][webtorrent-health-du]
[![Standard - Javascript Style Guide][standard-image]][standard-url]

Get health info about a webtorrent file or magnet link

## Install
```sh
npm install webtorrent-health
```

## Usage

The param `torrentId` can be a webtorrent file or magnet link, for more info check out [parse-torrent](https://github.com/feross/parse-torrent).

```js
webtorrentHealth(torrentId [, opts], callback)
```

```js
var webtorrentHealth = require('webtorrent-health')
var magnet = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d&dn=sintel.mp4&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com'

webtorrentHealth(magnet, function (err, data) {
  if (err) return console.error(err)

  console.log('average number of seeders: ' + data.seeds)
  console.log('average number of leechers: ' + data.peers)
  console.log('ratio: ', +(Math.round((data.peers > 0 ? data.seeds / data.peers : data.seeds) +'e+2') + 'e-2'))
})
```

You can also use Promises/A+:

```js
var webtorrentHealth = require('webtorrent-health')
var magnet = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d&dn=sintel.mp4&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com'

webtorrentHealth(magnet).then(function (data) {
  console.log('average number of seeders: ' + data.seeds)
  console.log('average number of leechers: ' + data.peers)
  console.log('ratio: ', +(Math.round((data.peers > 0 ? data.seeds / data.peers : data.seeds) +'e+2') + 'e-2'))
}).catch(console.error.bind(console))
```

If you couldn't scrape any of the trackers you will not get any errors, but the returned data will look like this:

```js
{
  seeds: 0,
  peers: 0,
  extra: [...]
}
```

The attribute `extra` is an Array of Objects, that contains more info about the each tracker. Example:
```js
[
  {
    tracker: 'wss://tracker.openwebtorrent.com',
    seeds: 561,
    peers: 12967,
    downloads: 561,
    response_time: 229
  },
  {
    tracker: 'wss://tracker.btorrent.xyz',
    seeds: 601,
    peers: 19119,
    downloads: 601,
    response_time: 705
  },
  {
    tracker: 'wss://tracker.badtracker.com',
    error: 'connection error to wss://tracker.badtracker.com'
  }
]
```

## Additional params

- `opts.trackers`: additional trackers to scrape on top of the ones `torrentId` has.
  - Type: an Array of Strings
  - Example:

```js
webtorrentHealth(torrentId, {
    trackers: ['wss://tracker.openwebtorrent.com']
}, function (err, data) {
  // Do something
})
```

- `opts.blacklist`: don't scrape some trackers.
  - Type: an Array of Strings (each string can be a regex)
  - Example:

```js
webtorrentHealth(torrentId, {
    blacklist: [
        'openbittorrent'    // will blacklist any tracker containing that string in its URI
    ]
}, function (err, data) {
  // Do something
})
```

- `opts.timeout`: timeout in milliseconds for each request to scarpe the tracker. Default is `1000`.
  - Type: number
  - Example:

```js
webtorrentHealth(torrentId, {
    timeout: 1500
}, function (err, data) {
  // Do something
})
```

## License

MIT. Copyright (c) [Alex](http://github.com/alxhotel)

[webtorrent-health-ti]: https://img.shields.io/travis/alxhotel/webtorrent-health/master.svg
[webtorrent-health-tu]: https://travis-ci.org/alxhotel/webtorrent-health
[webtorrent-health-ni]: https://img.shields.io/npm/v/webtorrent-health.svg
[webtorrent-health-nu]: https://npmjs.org/package/webtorrent-health
[webtorrent-health-di]: https://david-dm.org/alxhotel/webtorrent-health.svg
[webtorrent-health-du]: https://david-dm.org/alxhotel/webtorrent-health
[standard-image]: https://img.shields.io/badge/code_style-standard-brightgreen.svg
[standard-url]: https://standardjs.com

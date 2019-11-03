import Player from 'xgplayer'
import { Context, EVENTS } from 'xgplayer-utils';
import FLV from './flv-live-mobile'
const flvAllowedEvents = EVENTS.FlvAllowedEvents;

class FlvPlayer extends Player {
  constructor (config) {
    if (!config.mediaType) {
      config.mediaType = 'mobile-video'
    }
    super(config)
    this.context = new Context(flvAllowedEvents)
    this.initEvents()
  }

  start () {
    this.initFlv()
    this.context.init()
    this.flv.seek(0);
    super.start(this.config.url);
    this.play();
  }

  initFlvEvents (flv) {
    const player = this;
    flv.once(EVENTS.REMUX_EVENTS.INIT_SEGMENT, () => {
      Player.util.addClass(player.root, 'xgplayer-is-live')
      if (!Player.util.findDom(this.root, 'xg-live')) {
        const live = Player.util.createDom('xg-live', '正在直播', {}, 'xgplayer-live')
        player.controls.appendChild(live)
      }
    })

    flv.once(EVENTS.LOADER_EVENTS.LOADER_COMPLETE, () => {
      // 直播完成，待播放器播完缓存后发送关闭事件
      if (!player.paused) {
        const timer = setInterval(() => {
          const end = player.getBufferedRange()[1]
          if (Math.abs(player.currentTime - end) < 0.5) {
            player.emit('ended')
            window.clearInterval(timer)
          }
        }, 200)
      }
    })
    flv.on(EVENTS.BROWSER_EVENTS.VISIBILITY_CHANGE, (hidden) => {
      if (hidden) {
        this.pause()
      } else {
        this.play()
      }
    })
  }

  initEvents () {
    this.on('timeupdate', () => {
      this.loadData()
    })

    this.on('seeking', () => {
      const time = this.currentTime
      const range = this.getBufferedRange()
      if (time > range[1] || time < range[0]) {
        this.flv.seek(this.currentTime)
      }
    })
  }

  initFlv () {
    const flv = this.context.registry('FLV_CONTROLLER', FLV)(this)
    this.initFlvEvents(flv)
    this.flv = flv
  }

  play () {
    if (this._hasStart && this.paused) {
      this._destroy()
      this.context = new Context(flvAllowedEvents)
      const flv = this.context.registry('FLV_CONTROLLER', FLV)(this)
      this.initFlvEvents(flv)
      this.flv = flv
      this.context.init()
      this.loadData()
      super.start()
      super.play()
    } else {
      super.play()
    }
  }

  pause () {
    super.pause()
    if (this.flv) {
      this.flv.pause()
    }
  }

  loadData (time = this.currentTime) {
    if (this.flv) {
      this.flv.seek(time)
    }
  }
  destroy () {
    this._destroy()
    super.destroy();
  }

  _destroy () {
    this.context.destroy()
    this.flv = null
    this.context = null
  }

  get src () {
    return this.currentSrc
  }

  set src (url) {
    this.player.config.url = url
    if (!this.paused) {
      this.pause()
      this.once('pause', () => {
        this.start(url)
      })
      this.once('canplay', () => {
        this.play()
      })
    } else {
      this.start(url)
    }
    this.once('canplay', () => {
      this.currentTime = 0
    })
  }
}

module.exports = FlvPlayer

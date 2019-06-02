export default class Keyboard {
	constructor(options){
    this.body = document.body;
		this.onMove = options.onMove;
    this.game = options.game;
    this.forwardCount = null;
    this.shouldRun = null;
    this.forward = null;
    this.turn = null;

    this.body.addEventListener('keydown', (event)=>{
      this.onKeyDownHandler(event)
    })
    this.body.addEventListener('keyup', (event)=>{
      this.onKeyUpHandler(event)
    })
  }

  onKeyDownHandler(event){
    if(event.key === 'w'){
      console.log('player should move forward', this.forwardCount)
      this.forwardCount = this.forwardCount +1
      this.forward = event.type === 'keydown' ? 0.5 : null
    }
    if(event.key === 's'){
      console.log('BACK')
    }
    if(event.key === 'a'){
      console.log('player should turn left')
      this.turn = event.type === 'keydown' ? 1  : null
    }
    if(event.key === 'd'){
      console.log('player should turn right')
      this.turn = event.type === 'keydown' ? -1  : null
    }else{
      console.log('all handles missing', event)
    }
    this.onMove.call(this.game, this.forward, this.turn)
  }

  onKeyUpHandler(event){
    if(event.key === 'w'){
      console.log('cancel forward');
      this.fowardCount = 0;
      this.forward = null;
    }
    if(event.key === 'a' || 'd'){
      console.log('cancel turn');
      this.turn = null;
    }
    this.onMove.call(this.game, this.forward, this.turn)
  }
}
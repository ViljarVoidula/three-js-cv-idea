export default class Keyboard {
	constructor(options){
    this.body = document.body;
		this.onMove = options.onMove;
    this.game = options.game;
    this.body.addEventListener('keydown', (event)=>{
      this.keyHandler(event)
    })
    this.body.addEventListener('keyup', (event)=>{
      this.keyHandler(event)
    })
  }

  keyHandler(event){
    let forward = null;
    let turn = null; 
    if(event.key === 'w'){
     
      forward = event.type === 'keydown' ? 0.5 : null
    }
    if(event.key === 's'){
      console.log('BACK')
    }
    if(event.key === 'a'){
      forward = event.type === 'keydown' ? 0.5  : null
      turn = event.type === 'keydown' ? 1  : null
    }
    if(event.key === 'd'){
      forward = event.type === 'keydown' ? 0.5  : null
      turn = event.type === 'keydown' ? -1  : null
    }
    this.onMove.call(this.game, forward, turn)
  }
  
}
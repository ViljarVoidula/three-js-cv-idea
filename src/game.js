import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Zlib } from 'three/examples/js/libs/inflate.min';

import { JoyStick, KeyBoard } from './controls/'
import { Easing, Tween  } from './animations';
import { SFX, Preloader } from './utils';




window.Zlib = Zlib
export default class Game{
	constructor(){
		if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

		this.modes = Object.freeze({
			NONE:   Symbol("none"),
			PRELOAD: Symbol("preload"),
			INITIALISING:  Symbol("initialising"),
			CREATING_LEVEL: Symbol("creating_level"),
			ACTIVE: Symbol("active"),
			GAMEOVER: Symbol("gameover")
		});
		this.mode = this.modes.NONE;
		
		this.container;
		this.player = { };
		this.stats;
		this.controls;
		this.camera;
		this.scene;
		this.renderer;
		this.cellSize = 16;
		this.interactive = false;
		this.levelIndex = 0;
		this._hints = 0;
		this.score = 0;
		this.debug = false;
		this.debugPhysics = false;
		
		this.messages = { 
			text:[ 
			"Welcome to LostTreasure",
			"GOOD LUCK!"
			],
			index:0
		}
		
		if (localStorage && !this.debug){
			//const levelIndex = Number(localStorage.getItem('levelIndex'));
			//if (levelIndex!=undefined) this.levelIndex = levelIndex;
		}
		
		this.container = document.createElement( 'div' );
		this.container.style.height = '100%';
		document.body.appendChild( this.container );
		
		const sfxExt = SFX.supportsAudioType('mp3') ? 'mp3' : 'ogg';
        
		const game = this;
		this.anims = ["run", "gather-objects", "look-around"];
		
		this.assetsPath = '../assets/';
		
		const options = {
			assets:[
			],
			oncomplete: function(){
				game.init();
				game.animate();
			}
		}
		
		this.anims.forEach( function(anim){ options.assets.push(`${game.assetsPath}fbx/${anim}.fbx`)});
		
		this.mode = this.modes.PRELOAD;
		

		this.clock = new THREE.Clock();

		const preloader = new Preloader(options);
		
		window.onError = function(error){
			console.error(JSON.stringify(error));
		}
	}
	
	initSfx(){
		this.sfx = {};
		this.sfx.context = new (window.AudioContext || window.webkitAudioContext)();
		this.sfx.gliss = new SFX({
			context: this.sfx.context,
			src:{mp3:`${this.assetsPath}sfx/gliss.mp3`, ogg:`${this.assetsPath}sfx/gliss.ogg`},
			loop: false,
			volume: 0.3
		});
	}
	
	set activeCamera(object){
		this.player.cameras.active = object;
	}
	
	init() {
		this.mode = this.modes.INITIALISING;

		this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
		
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0xa0a0a0 );
		this.scene.fog = new THREE.Fog( 0xa0a0a0, 200, 1000 );

		let light = new THREE.HemisphereLight( 0xffffff, 0x444444 );
		light.position.set( 0, 200, 0 );
		this.scene.add( light );

		light = new THREE.DirectionalLight( 0xffffff );
		light.position.set( 0, 200, 100 );
		light.castShadow = true;
		light.shadow.camera.top = 180;
		light.shadow.camera.bottom = -100;
		light.shadow.camera.left = -120;
		light.shadow.camera.right = 120;
		this.scene.add( light );

		// ground
		var mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
		mesh.rotation.x = - Math.PI / 2;
		//mesh.position.y = -100;
		mesh.receiveShadow = true;
		this.scene.add( mesh );

		var grid = new THREE.GridHelper( 2000, 40, 0x000000, 0x000000 );
		//grid.position.y = -100;
		grid.material.opacity = 0.2;
		grid.material.transparent = true;
		this.scene.add( grid );

		// model
		const loader = new FBXLoader();
		const game = this;
		
		loader.load( `${this.assetsPath}fbx/girl-walk.fbx`, function ( object ) {

			object.mixer = new THREE.AnimationMixer( object );
			game.player.mixer = object.mixer;
			game.player.root = object.mixer.getRoot();
			
			object.name = "Character";
					
			object.traverse( function ( child ) {
				if ( child.isMesh ) {
					child.castShadow = true;
					child.receiveShadow = true;		
				}
			} );
			
			game.scene.add(object);
			game.player.object = object;
			game.player.walk = object.animations[0];
			
			game.joystick = new JoyStick({
				onMove: game.playerControl,
				game: game
			});

			game.KeyBoard = new KeyBoard({
				onMove: game.playerControl,
				game: game
			})
			
			
			game.createCameras();
			game.loadNextAnim(loader);
		} );
		
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.shadowMap.enabled = true;
		this.container.appendChild( this.renderer.domElement );
			
		window.addEventListener( 'resize', function(){ game.onWindowResize(); }, false );

		// stats
		if (this.debug){
			this.stats = new Stats();
			this.container.appendChild( this.stats.dom );
		}
	}

	playerControl(forward, turn){
		//console.log(`playerControl(${forward}), ${turn}`);
        
		if (forward>0){
			if (this.player.action!='walk') this.action = 'walk';
		}else{
			if (this.player.action=="walk") this.action = 'look-around';
		}
		if (forward==0 && turn==0){
			delete this.player.move;
		}else{
			this.player.move = { forward, turn }; 
		}
	}
	
	createCameras(){
		const offset = new THREE.Vector3(0, 60, 0);
		const front = new THREE.Object3D();
		front.position.set(112, 100, 200);
		front.quaternion.set(0.07133122876303646, -0.17495722675648318, -0.006135162916936811, -0.9819695435118246);
		front.parent = this.player.object;
		const back = new THREE.Object3D();
		back.position.set(0, 200, -250);
		back.quaternion.set(-0.001079297317118498, -0.9994228131639347, -0.181748701462123836, -0.031856610911161515);
		back.parent = this.player.object;
		const wide = new THREE.Object3D();
		wide.position.set(178, 139, 465);
		wide.quaternion.set(0.07133122876303646, -0.17495722675648318, -0.006135162916936811, -0.9819695435118246);
		wide.parent = this.player.object;
		const overhead = new THREE.Object3D();
		overhead.position.set(0, 400, 0);
		overhead.quaternion.set(0.02806727427333993, 0.7629212874133846, 0.6456029820939627, 0.018977008134915086);
		overhead.parent = this.player.object;
		const collect = new THREE.Object3D();
		collect.position.set(40, 82, 94);
		collect.quaternion.set(0.07133122876303646, -0.17495722675648318, -0.006135162916936811, -0.9819695435118246);
		collect.parent = this.player.object;
		this.player.cameras = { front, back, wide, overhead, collect };
		game.activeCamera = this.player.cameras.wide;
		game.cameraFade = 0.1;
		setTimeout( function(){ 
			game.activeCamera = game.player.cameras.back; 
		}, 2000)
	}
	
	loadNextAnim(loader){
		let anim = this.anims.pop();
		const game = this;
		loader.load( `${this.assetsPath}fbx/${anim}.fbx`, function( object ){
			game.player[anim] = object.animations[0];
			if (game.anims.length>0){
				game.loadNextAnim(loader);
			}else{
				delete game.anims;
				game.action = "look-around";
				game.mode = game.modes.ACTIVE;
			}
		});	
	}
	
	createCannonTrimesh(geometry){
		if (!geometry.isBufferGeometry) return null;
		
		const posAttr = geometry.attributes.position;
		const vertices = geometry.attributes.position.array;
		let indices = [];
		for(let i=0; i<posAttr.count; i++) indices.push(i);
		
		return new CANNON.Trimesh(vertices, indices);
	}
	
	getMousePosition(clientX, clientY){
		const pos = new THREE.Vector2();
		pos.x = (clientX / this.renderer.domElement.clientWidth) * 2 - 1;
		pos.y = -(clientY / this.renderer.domElement.clientHeight) * 2 + 1;
		return pos;
	}
	
	tap(evt){
		if (!this.interactive) return;
		
		let clientX = evt.targetTouches ? evt.targetTouches[0].pageX : evt.clientX;
		let clientY = evt.targetTouches ? evt.targetTouches[0].pageY : evt.clientY;
		
		this.mouse = this.getMousePosition(clientX, clientY);
		
		//const rayCaster = new THREE.Raycaster();
		//rayCaster.setFromCamera(mouse, this.camera);
		
	}
	
	move(evt){
		
	}
	
	up(evt){
		
	}
	
	showMessage(msg, fontSize=20, onOK=null){
		const txt = document.getElementById('message_text');
		txt.innerHTML = msg;
		txt.style.fontSize = fontSize + 'px';
		const btn = document.getElementById('message_ok');
		const panel = document.getElementById('message');
		const game = this;
		if (onOK!=null){
			btn.onclick = function(){ 
				panel.style.display = 'none';
				onOK.call(game); 
			}
		}else{
			btn.onclick = function(){
				panel.style.display = 'none';
			}
		}
		panel.style.display = 'flex';
	}
	
	loadJSON(name, callback) {   

		var xobj = new XMLHttpRequest();
			xobj.overrideMimeType("application/json");
		xobj.open('GET', `${name}.json`, true); // Replace 'my_data' with the path to your file
		xobj.onreadystatechange = function () {
			  if (xobj.readyState == 4 && xobj.status == "200") {
				// Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
				callback(xobj.responseText);
			  }
		};
		xobj.send(null);  
	 }
	
	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize( window.innerWidth, window.innerHeight );

	}

	set action(name){
		const anim = this.player[name];
		const action = this.player.mixer.clipAction( anim,  this.player.root );
        action.time = 0;
		this.player.mixer.stopAllAction();
        if (this.player.action == 'gather-objects'){
            delete this.player.mixer._listeners['finished'];
        }
        if (name=='gather-objects'){
            action.loop = THREE.LoopOnce;
            const game = this;
            this.player.mixer.addEventListener('finished', function(){ 
                console.log("gather-objects animation finished");
                game.action = 'look-around'; 
            });
        }
		this.player.action = name;
		action.fadeIn(0.5);	
		action.play();
	}
	
	animate() {
		const game = this;
		const dt = this.clock.getDelta();
		
		requestAnimationFrame( function(){ game.animate(); } );
		
		if (this.player.mixer!=undefined && this.mode==this.modes.ACTIVE) this.player.mixer.update(dt);
		
		if (this.player.move!=undefined){
			if (this.player.move.forward>0) this.player.object.translateZ(dt*100);
			this.player.object.rotateY(this.player.move.turn*dt);
		}
		
		if (this.player.cameras!=undefined && this.player.cameras.active!=undefined){
			this.camera.position.lerp(this.player.cameras.active.getWorldPosition(new THREE.Vector3()), 0.05);
			this.camera.quaternion.slerp(this.player.cameras.active.getWorldQuaternion(new THREE.Quaternion()), 0.05);
		}
		
		this.renderer.render( this.scene, this.camera );

		if (this.stats!=undefined) this.stats.update();

	}
}









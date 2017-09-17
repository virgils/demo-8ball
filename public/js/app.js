var device = mobilecheck() && Modernizr.touchevents && Modernizr.devicemotion ? 'controller' : 'game';

// scene container element ------------------------------------------------------------------------
var container = document.getElementById('container');

// THREE objects  ---------------------------------------------------------------------------------
var camera, scene, renderer;
var sceneW, sceneH;
var physicsMaterial;
var ground;
var clock = new THREE.Clock();
var ball = [];

// initialize the physics demo --------------------------------------------------------------------
var initScene = function() {
    // store scene dimensions
    sceneW = container.offsetWidth;
    sceneH = container.offsetHeight;

    // build the 3d world
    buildPhysicsScene();
    buildRenderer();
    buildCamera();
    buildGround();
    buildBall(8);
    buildLights();

    // start
    animate();
};

// build the WebGL renderer -----------------------------------------------------------------------
var buildRenderer = function() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(sceneW, sceneH);
    renderer.setClearColorHex(0x000000);
    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = true;
    renderer.shadowMapType = THREE.PCFShadowMap;
    renderer.shadowMapAutoUpdate = true;

    container.appendChild(renderer.domElement);
};

// add an ambient light and a spot light for shadowing --------------------------------------------
var buildLights = function() {
    //scene.add( new THREE.AmbientLight( 0x666666) );

    var light = new THREE.SpotLight(0xffffff);
    light.position.set(0, 1000, 0);
    light.target.position.copy(scene.position);
    light.shadowCameraTop = -700;
    light.shadowCameraLeft = -700;
    light.shadowCameraRight = 700;
    light.shadowCameraBottom = 700;
    light.shadowCameraNear = 20;
    light.shadowCameraFar = 1400;
    light.shadowBias = -.0001;
    light.shadowMapWidth = light.shadowMapHeight = 1024;
    light.shadowDarkness = .25;
    light.castShadow = false;
    light.shadowCameraVisible = false;
    scene.add(light);

    var light = new THREE.SpotLight(0xcccccc);
    light.position.set(1000, 500, 1000);
    light.target.position.copy(scene.position);
    light.shadowCameraTop = 1000;
    light.shadowCameraLeft = 800;
    light.shadowCameraRight = 0;
    light.shadowCameraBottom = 0;
    light.shadowCameraNear = 20;
    light.shadowCameraFar = 2000;
    light.shadowBias = -.0001;
    light.shadowMapWidth = light.shadowMapHeight = 1424;
    light.shadowDarkness = .15;
    light.castShadow = true;
    light.shadowCameraVisible = false;
    scene.add(light);

    var light = new THREE.SpotLight(0xcccccc);
    light.position.set(-1000, -500, 2000);
    light.target.position.copy(scene.position);
    light.shadowCameraTop = -1000;
    light.shadowCameraLeft = -800;
    light.shadowCameraRight = 0;
    light.shadowCameraBottom = 0;
    light.shadowCameraNear = 20;
    light.shadowCameraFar = 2000;
    light.shadowBias = -.0001;
    light.shadowMapWidth = light.shadowMapHeight = 1424;
    light.shadowDarkness = .15;
    light.castShadow = true;
    light.shadowCameraVisible = false;
    scene.add(light);

};

// build the THREE camera -------------------------------------------------------------------------
var buildCamera = function() {
    camera = new THREE.PerspectiveCamera(50, sceneW / sceneH, 1, 10000);
    // move camera up and back, and point it down at the center of the 3d scene
    camera.position.z = 800;
    camera.position.y = 200;
    camera.lookAt(new THREE.Vector3(0, 0, 0));
};

// build the Physijs scene, which takes the place of a THREE scene --------------------------------
var buildPhysicsScene = function() {
    // lean about Physi.js basic setup here: https://github.com/chandlerprall/Physijs/wiki/Basic-Setup
    // set the path of the web worker javascripts
    Physijs.scripts.worker = 'js/physijs/physijs_worker.js';
    Physijs.scripts.ammo = 'ammo.js'; // must be relative to physijs_worker.js

    // init the scene
    scene = new Physijs.Scene({ reportsize: 50, fixedTimeStep: 1 / 60 });
    scene.setGravity(new THREE.Vector3(0, -800, 0));
};

// build the ground plane and rotate it to be flat ------------------------------------------------
var buildGround = function() {
    var groundGeometry = new THREE.PlaneGeometry(650, 500, 10, 10);    

    var groundMaterial = Physijs.createMaterial(
        new THREE.MeshPhongMaterial({
            shininess: 1,
            color: 0xb00000,
            emissive: 0x111111,
            side: THREE.DoubleSide
        }),
        .8, // friction
        .4 // restitution
    );

    ground = new Physijs.HeightfieldMesh(groundGeometry, groundMaterial, 0);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.castShadow = true;

    scene.add(ground);
};


// build the ball and draw its texture with a 2d canvas -------------------------------------------
var buildBall = function(numberBall) {

    var ballTexture = new THREE.Texture();
    var ballIndex = ball.length;

    ballTexture = THREE.ImageUtils.loadTexture('textures/' + numberBall + '_Ball.jpg', function(image) {
        ballTexture.image = image;
    });


    // create the physijs-enabled material with some decent friction & bounce properties
    var ballMaterial = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({
            map: ballTexture,
            shininess: 10,
            color: 0xdddddd,
            emissive: 0x111111,
            side: THREE.FrontSide
        }),
        .6, // friction
        .5 // restitution
    );
    // texture mapping
    ballMaterial.map.wrapS = ballMaterial.map.wrapT = THREE.RepeatWrapping;
    ballMaterial.map.repeat.set(1, 1);

    // create the physics-enabled sphere mesh, and start it up in the air
    ball[ballIndex] = new Physijs.SphereMesh(
        new THREE.SphereGeometry(25, 25, 25),
        ballMaterial,
        100
    );

    ball[ballIndex].position.y = 500;
    ball[ballIndex].rotation.y = degToRad(-45);

    ball[ballIndex].receiveShadow = true;
    ball[ballIndex].castShadow = true;
    scene.add(ball[ballIndex]);

};

var bounceGround = function() {
    ground.setLinearVelocity(new THREE.Vector3(0, 500, 0));

    TweenMax.to(ground.position, 0.4, {
        y: 200,
        onUpdate: function() {
            ground.__dirtyPosition = true;

            TweenMax.to(ground.position, 1, {
                y: 0,
                onUpdate: function() {
                    ground.__dirtyPosition = true;

                    ground.setLinearVelocity(new THREE.Vector3(0, 0, 0));

                }
            });

        }
    });
};

// update the physics engine and render every frame -----------------------------------------------
var animate = function() {
    scene.simulate(); // run physics
    renderer.render(scene, camera); // render the scene

    // if the ball is offscreen reset it to the top
    for (i = 0; i < ball.length; i++) {
        if (ball[i].position.y < -2000) {
            resetBall(i);
        }
    }

    // continue animating
    requestAnimationFrame(animate);
};

// randomly toss the ball on mouse click ----------------------------------------------------------
var resetBall = function(i) {
    ball[i].__dirtyPosition = true;

    ball[i].setLinearVelocity(new THREE.Vector3(0, 0, 0));

    ball[i].position.y = 500;
    ball[i].position.x = 0;
    ball[i].position.z = 0;
};

// kick it off ------------------------------------------------------------------------------------
var hasWebGL = (function() {
    // from Detector.js
    try {
        return !!window.WebGLRenderingContext && !!document.createElement('canvas').getContext('experimental-webgl');
    } catch (e) {
        return false;
    }
})();

if (hasWebGL && device === 'game') {
    initScene();
} else {
    //alert('You don\'t seem to have WebGL, which is required for this demo.');
};

var initGame = function() {
    var controller = $("#controller");
    var gameConnect = $("#gameConnect");
    var wheel = $("#wheel");
    var status = $("#status");

    if (device === 'controller') {
        // show the controller ui with gamecode input
        controller.show();

        // when connect is pushed, establish socket connection
        $("#connect").click(function() {
            var gameCode = $("#socket input").val().toLowerCase();
            var socket = io.connect();

            // when server replies with initial welcome...
            socket.on('welcome', function(data) {
                // send 'controller' device type with our entered game code
                socket.emit("device", { "type": "controller", "gameCode": gameCode });
            });

            // when game code is validated, we can begin playing...
            socket.on("connected", function(data) {
                // hide game code input, and show the vehicle wheel UI
                $("#socket").hide();
                wheel.show();

                // position Variables
                var x = y = z = 0;
                var y = 0;
                // acceleration
                var ax = ay = az = ai = arAlpha = arBeta = arGamma = 0;
                var intervalTime = 100;
                var vMultiplier = 0.01;
                var alpha = 0;
                var alpha = beta = gamma = 0;
                var rotY = rotX = 0;
                var desktop = false;

                $('#container').css('background-color', '#b00000')

                window.ondevicemotion = function(event) {
                    ax = Math.round(Math.abs(event.accelerationIncludingGravity.x * 1));
                    ay = Math.round(Math.abs(event.accelerationIncludingGravity.y * 1));
                    az = Math.round(Math.abs(event.accelerationIncludingGravity.z * 1));
                    ai = Math.round(event.interval * 100) / 100;
                    rR = event.rotationRate;
                    if (rR != null) {
                        arAlpha = Math.round(rR.alpha);
                        arBeta = Math.round(rR.beta);
                        arGamma = Math.round(rR.gamma);
                    }
                }

                window.ondeviceorientation = function(event) {
                    alpha = Math.round(event.alpha);
                    beta = Math.round(event.beta);
                    gamma = Math.round(event.gamma);
                    rotY = event.beta;
                    rotX = event.gamma;
                }

                function d2h(d) {
                    return d.toString(16);
                }

                function h2d(h) {
                    return parseInt(h, 16);
                }

                // send 
                setInterval(function() {
                    socket.emit('send gyro', [Math.round(rotY), Math.round(rotX), ay, ax]);
                }, intervalTime);

                function sendTap() {
                    socket.emit('tap', true);
                }

                addEventListener("touchstart", sendTap, false);


            });

            socket.on("fail", function() {
                status.html("Failed to connect");
            });

        });

    }
    // if client is browser game
    else {
        var socket = io.connect();

        // when initial welcome message, reply with 'game' device type
        socket.on('welcome', function(data) {
            socket.emit("device", { "type": "game" });
        });

        // we receive our game code to show the user
        socket.on("initialize", function(gameCode) {
            $("#gameConnect").show();
            $("#socketId").html(gameCode);
        });

        // when the user inputs the code into the phone client,
        // we become 'connected'.  Start the game.
        socket.on("connected", function(data) {
            $("#gameConnect").hide();
            $("#status").hide();

            // move ball
            ball[0].setLinearVelocity(new THREE.Vector3(30, 0, 30));

            $("#tip").show();

            TweenMax.to($("#tip"), 0.4, { delay: 3, opacity: 1,
                onComplete: function() {
                    TweenMax.to($("#tip"), 0.4, { delay: 7, opacity: 0,
                        onComplete: function() {
                            $("#tip").remove();
                        }
                    });
                }
            });

        });

        // Create balls / Bounce ground on spacebar
        $('body').unbind('keydown').keydown(function(e) {
            if (e.keyCode == 49) {
                buildBall(1);
            } else if (e.keyCode == 50) {
                buildBall(2);
            } else if (e.keyCode == 51) {
                buildBall(3);
            } else if (e.keyCode == 32) {
                bounceGround();
            }
        });

        // on tap bounce ground
        socket.on('tap', function(data) {
            bounceGround();
        });

        // handle incoming gyro data
        socket.on('new gyro', function(data) {

            var degY = data[1] < 0 ? Math.abs(data[1]) : -data[1];

            TweenMax.to(ground.rotation, 0.3, {
                x: degToRad(degY - 90),
                y: degToRad(data[0]),
                ease: Linear.easeNone,
                onUpdate: function() {
                    ground.__dirtyRotation = true;
                }
            });
        });
    }
};

initGame();



// Make subfolders for volume function
function planeController(obj,name,axes,parentFolder) {
    //debugger;
    var planeFolder = parentFolder.addFolder(name);
    let origDir = obj.slice.planeDirection;
    //debugger;
    planeFolder.add(obj, 'index', 0, obj.orientationMaxIndex, 1).name('Slice').listen();
    for (ax of axes) {
        planeFolder.add(obj.slice.planeDirection,ax,-Math.PI*2,Math.PI*2,0.1).name('Rotate' + ax.toUpperCase()).onChange(function(newVal){
            //debugger;
            obj.slice.planeDirection = new THREE.Vector3().set(this.object.x,this.object.y,this.object.z);
            obj.border.helpersSlice = obj.slice;
        });
    }
    
    planeFolder.add(obj,'visible').name('Visible');
    return planeFolder;
}

function plane2Scene(cfg,volFolder) {
    cfg.obj.name = cfg.Name;
    cfg.obj.border.color = cfg.color;
    cfg.obj.children[0].visible = false;
    cfg.obj.orientation = cfg.ori;

    // Build dat.gui folder for it
    var planeFolder = parentFolder.addFolder(cfg.Name);
    planeFolder.add(cfg.obj, 'index', 0, cfg.obj.orientationMaxIndex, 1).name('Slice').listen();
    for (ax of axes) {
        planeFolder.add(cfg.obj.slice.planeDirection,ax,-1,1,0.1).name('Rotate' + ax.toUpperCase()).onChange(function(newVal){
            //debugger;
            cfg.obj.slice.planeDirection = new THREE.Vector3().set(this.object.x,this.object.y,this.object.z);
            cfg.obj.border.helpersSlice = cfg.obj.slice;
        });
    }
    planeFolder.add(cfg.obj,'visible',true).name('Visible').listen();
    scene.add(cfg.obj);
    return planeFolder;

}


/**
 * parse Freesurfer Mesh files
 */
function parseFSMesh(idx, files,container) {
    let fsmLoader = new THREE.FreeSurferLoader(container);
    return (
        Promise.resolve()
        // load the file
        .then(function () {
            return new Promise(function (resolve, reject) {
                let myReader = new FileReader();
                // should handle errors too...
                myReader.addEventListener('load', function (e) {
                    resolve(e.target.result);
                    //resolve(e.target.responseText);
                });
                myReader.readAsArrayBuffer(files[idx]);
            });
        })
        .then(function (buffer) {
            //debugger;
            return fsmLoader.parse(buffer);
        })
        .then(function (brainVol) {
            let surfExt = files[idx].name.split('.')[1];
            let currentColor = {
                color: surfColors[surfExt]
            };
            const material = new THREE.MeshLambertMaterial({
                color: currentColor.color, //'rgb(120,120,120)',
                transparent: true
            });
            material.side = THREE.FrontSide;
            brainVol.computeVertexNormals();
            let mesh = new THREE.Mesh(brainVol, material);
            mesh.name = files[idx].name;

            // Choose rendering order

            if (surfExt == 'pial') {
                mesh.renderOrder = 10;
            } else if (surfExt == 'white') {
                mesh.renderOrder = 7;
            } else {
                mesh.renderOrder = 5;
                mesh.material.depthWrite = false;
            }


            //debugger;
            meshFolder = surfFolder.addFolder(files[idx].name);
            meshFolder.add(material, 'opacity', 0, 1).name('Opacity'); // Add folder to viewerGui for this mesh
            var colorchanger = meshFolder.addColor(currentColor, 'color').name("color");
            //debugger;
            colorchanger.onChange(function (colorVal) {
                let newColor = colorVal.replace('#', '0x');
                material.color.setHex(newColor);
            });
            //meshFolder.open();
            /*const RASToLPS = new THREE.Matrix4();
            RASToLPS.set(
                -1, 0, 0, 0, 
                0, -1, 0, 0, 
                0, 0, 1, 0, 
                0, 0, 0, 1);
            mesh.applyMatrix(RASToLPS);*/
            scene.add(mesh);
        })
        .catch(function (error) {
            window.console.log('oops... something went wrong...');
            window.console.log(error);
        })
    );
}


/**
 * parse MGZ files
 */
function parseVolume(idx, files, container, fuzz) {
    var volLoader = new AMI.VolumeLoader(container);
    return (
        Promise.resolve()
        // load the file
        .then(function () {
            return new Promise(function (resolve, reject) {
                let myReader = new FileReader();
                // should handle errors too...
                myReader.addEventListener('load', function (e) {
                    resolve(e.target.result);
                });
                myReader.readAsArrayBuffer(files[idx]);
            });
        })
        .then(function (buffer) {
            //return fsmLoader.parse({ url: files[idx].name, buffer });
            return volLoader.parse({
                url: files[idx].name,
                buffer
            });
        })
        .then(function (brainVol) {
            var stackT1 = brainVol.stack[0];
            stackT1.prepare();
            brainVol = stackT1;
            //debugger;
            var RASToLPS = new THREE.Matrix4();
            var worldCenter = stackT1.worldCenter();
            RASToLPS.set(
                -1, 0, 0, worldCenter.x,
                0, -1, 0, worldCenter.y,
                0, 0, 1, worldCenter.z,
                0, 0, 0, 1);
            var lps2ras = new THREE.Matrix4().getInverse(RASToLPS);
            stackT1.regMatrix = lps2ras;
            stackT1.computeIJK2LPS();
            
            var sHelper = new AMI.StackHelper(stackT1);
            sHelper.bbox.color = 0xff0000;
            sHelper.border.color = 0x00ff00;
            sHelper.children[0].visible = false;
            sHelper.orientation = 0;
            var volFolder = sceneGui.addFolder('Volume');
            const orients = {
                'Coronal': {'ori': 0, 'obj': new AMI.StackHelper(stackT1), 'color': 0xff0000,'axes': ['x','y']},
                'Saggital': {'ori': 1, 'obj': new AMI.StackHelper(stackT1), 'color': 0x00ff00, 'axes': ['y','z']},
                'Axial': {'ori': 2, 'obj': new AMI.StackHelper(stackT1), 'color': 0x0000ff, 'axes': ['x','z']}
            };

            /*const orients = [
                {'Name': 'Coronal', 'ori': 0, 'obj': new AMI.StackHelper(stackT1), 'color': 0xff0000,'axes': ['x','y']},
                {'Name': 'Saggital','ori': 1, 'obj': new AMI.StackHelper(stackT1), 'color': 0x00ff00, 'axes': ['y','z']},
                {'Name': 'Axial','ori': 2, 'obj': new AMI.StackHelper(stackT1), 'color': 0x0000ff, 'axes': ['x','z']}
            ];*/
            for (plane in orients) {
                orients[plane]['obj'].name = plane;
                orients[plane]['obj'].border.color = orients[plane]['color'];
                orients[plane]['obj'].children[0].visible = false;
                orients[plane]['obj'].orientation = orients[plane]['ori'];
                planeController(orients[plane]['obj'],plane,orients[plane]['axes'],volFolder);
                scene.add(orients[plane]['obj']);
            }

            //debugger;
            /*var volFolder = sceneGui.addFolder('Volume');
            //volFolder.add(sHelper, 'orientation', 0, 2, 1).name('coronal').listen();
            volFolder.add(sHelper, 'index', 0, sHelper.orientationMaxIndex, 1).name('ci').listen();
            scene.add(sHelper);

            var sHelper2 = new AMI.StackHelper(stackT1);
            sHelper2.name = 'saggital';
            sHelper2.bbox.color = 0xff0000;
            sHelper2.border.color = 0x00ff00;
            sHelper2.children[0].visible = false;
            sHelper2.orientation = 1;
            //volFolder.add(sHelper2, 'orientation', 0, 2, 1).name('saggital').listen();
            volFolder.add(sHelper2, 'index', 0, sHelper2.orientationMaxIndex, 1).name('si').listen();
            scene.add(sHelper2);*/
            //return sHelper
        })
        /*.then(function (s) {
            // Add the three slices to the scene
            //scene.add(s);
            var volFolder = sceneGui.addFolder('Volume');
            const orients = {'Coronal': 0,'Saggital': 1, 'Axial': 2};
            for (o in orients) {
                let s = sHelper;
                s.orientation = orients[o];
                volFolder.add(s, 'index', 0, s.orientationMaxIndex, 1).name(o).listen();
                scene.add(s);
            }
            
            volFolder.add(s, 'orientation', 0, 2, 1).listen();
            volFolder.add(s, 'index', 0, s.orientationMaxIndex, 1).listen();
            
        })*/
        .catch(function (error) {
            window.console.log('oops... something went wrong...');
            window.console.log(error);
        })
    );
}

/**
 * parse electrode JSON file
 */
function parseElecJson(idx, files, table) {
    return (
        Promise.resolve()
        .then(function () {
            return new Promise(function (resolve, reject) {
                let myReader = new FileReader();
                // should handle errors too...
                myReader.addEventListener('load', function (e) {
                    resolve(e.target.result);
                });
                myReader.readAsText(files[idx]);
            });
        })
        .then(function (rawText) {
            //debugger;
            let parsedText = JSON.parse(rawText);
            // Ictals, Functions, Color, Shape, Size
            const contactInfo = ['soz','spikey','motor','motor','sensory','visual','auditory','language'];
            parsedText.forEach(function (elecObj) {
                // If any mandatory specs missing, add it
                for (spec of contactInfo) {
                    if (!elecObj.hasOwnProperty(spec)) {
                        elecObj[spec] = false;
                    }
                }
            })
            return parsedText;
        })
        .then(function (elecData) {
            //debugger;
            elecTable.setData(elecData)
                .then(function () {
                    document.getElementById("selectElecs").classList.remove("w3-disabled");
                    document.getElementById("toggleEditTable").classList.remove("w3-disabled");
                    document.getElementById("clearElecsBttn").classList.remove("w3-disabled");
                    document.getElementById("toggleEditTableCheck").disabled = false;

                    // Checkbox to enable editing of elecTable
                    editableColumns = ['soz', 'spikey', 'motor', 'sensory', 'visual', 'auditory', 'language'];
                    let editColButton = document.getElementById("toggleEditTable").children[0];
                    editColButton.addEventListener('click', function (event) {
                        editableColumns.forEach(function (col) {
                            elecTable.updateColumnDefinition(col, {
                                editable: editColButton.checked
                            })
                        })
                    });

                })
                .catch(function (error) {
                    window.console.log('oops... something went wrong when loading elecTable');
                    window.console.log(error);
                });
        })
        .catch(function (error) {
            window.console.log('oops... something went wrong...');
            window.console.log(error);
        })
    );
}

function plusDivs(chng) {
    // First, index all of the ElecSlice elements
    //debugger;
    //let eSlices = document.getElementsByClassName("ElecSlice");
    let eSlices = document.querySelectorAll('#elecSlideshow .ElecSlice');
    slideIndex += chng;
    if (slideIndex > eSlices.length) {
        slideIndex = 1
    }
    if (slideIndex < 1) {
        slideIndex = eSlices.length
    }
    for (let i = 0; i < eSlices.length; i++) {
        eSlices[i].style.display = "none";
    }
    eSlices[slideIndex - 1].style.display = "block";

}

/**
 * parse JellyFish formatted overlay file
 */
function parseOverlay(idx, files, table) {
    return (
        Promise.resolve()
        .then(function () {
            return new Promise(function (resolve, reject) {
                let myReader = new FileReader();
                // should handle errors too...
                myReader.addEventListener('load', function (e) {
                    resolve(e.target.result);
                });
                myReader.readAsText(files[idx]);
            });
        })
        .then(function (rawText) {
            //debugger;
            let parsedText = JSON.parse(rawText);
            overlay = parsedText;
            

            // This will eventually have to go, but for now it's ok
            let meshName = parsedText.mesh;
            let meshController = sceneGui.__folders['Surfaces'].__folders[meshName];
            let l = meshController.__controllers.length;
            for (var ii = 0; ii < l; ii++) {meshController.__controllers[0].remove();}

            let funcLut = new THREE.Lut('cooltowarm',200);
            funcLut.setMin(Math.min(...parsedText.data));
            funcLut.setMax(Math.max(...parsedText.data));
            const verts = ['a','b','c'];

            var obj = scene.getObjectByName(meshName);
            let cols = parsedText.data.map(function(n){return funcLut.getColor(n)}); 
            obj.geometry.faces.forEach(function(f){
                var jj = 0;
                for(v of verts) {
                    f.vertexColors[jj] = ( cols[f[v]] );
                    jj++;
                }
            });

            var newMat = new THREE.MeshLambertMaterial({
                vertexColors: THREE.VertexColors,
                transparent: true
            });
            obj.material = newMat;
            obj.geometry.colorsNeedUpdate = true;
            obj.geometry.elementsNeedUpdate = true;

            meshController.add(newMat,'opacity',0,1).name('Opacity').listen();
            var minSlider = meshController.add(funcLut,'minV',funcLut.minV, funcLut.maxV).name('Min').listen();
            minSlider.onChange(function(newMin){
                let newColors = parsedText.data.map(function(n){ return n > newMin ? funcLut.getColor(n) : new THREE.Color(0.5,0.5,0.5)});
                obj.geometry.faces.forEach(function(f){
                    var kk = 0;
                    for(v of verts) {
                        f.vertexColors[kk] = ( newColors[f[v]] );
                        kk++;
                    }
                });
                obj.geometry.colorsNeedUpdate = true;
                obj.geometry.elementsNeedUpdate = true;
            })
            var maxSlider = meshController.add(funcLut,'maxV',funcLut.minV, funcLut.maxV).name('Max').listen();
            maxSlider.onChange(function(newMax){
                let newColors = parsedText.data.map(function(n){ return n < newMax ? funcLut.getColor(funcLut.maxV) : funcLut.getColor(n)});
                obj.geometry.faces.forEach(function(f){
                    var kk = 0;
                    for(v of verts) {
                        f.vertexColors[kk] = ( newColors[f[v]] );
                        kk++;
                    }
                });
                obj.geometry.colorsNeedUpdate = true;
                obj.geometry.elementsNeedUpdate = true;
            })
        })
        .catch(function (error) {
            window.console.log('oops... something went wrong...');
            window.console.log(error);
        })
    );
}

// Check if some necessary properties are there including:
// Ictals, Functions, Color, Shape, Size
const contactInfo = ['soz','spikey','motor','motor','sensory','visual','auditory','language'];
const aesInfo = ['color','shape','size'];

// If any mandatory specs missing, add it
for (spec of contactInfo) {
    if (!elecObj.hasOwnProperty(spec)) {
        elecObj[spec] = false;
    }
}

// Include gridid as a field
elecObj['gridid'] = elecObj['label'].replace(/[0-9]/g,'');

// Start new viewer for 2D scenes

rendererObj.domElement = document.getElementById(rendererObj.domId);
rendererObj.renderer = new THREE.WebGLRenderer({
    antialias: true,
});
rendererObj.renderer.autoClear = false;
rendererObj.renderer.localClippingEnabled = true;
rendererObj.renderer.setSize(
    rendererObj.domElement.clientWidth,
    rendererObj.domElement.clientHeight
);
rendererObj.renderer.setClearColor(0x121212, 1);
rendererObj.renderer.domElement.id = rendererObj.targetID;
rendererObj.domElement.appendChild(rendererObj.renderer.domElement);

// camera
rendererObj.camera = new CamerasOrthographic(
    rendererObj.domElement.clientWidth / -2,
    rendererObj.domElement.clientWidth / 2,
    rendererObj.domElement.clientHeight / 2,
    rendererObj.domElement.clientHeight / -2,
    1,
    1000
);

// controls
rendererObj.controls = new ControlsOrthographic(rendererObj.camera, rendererObj.domElement);
rendererObj.controls.staticMoving = true;
rendererObj.controls.noRotate = true;
rendererObj.camera.controls = rendererObj.controls;

// scene
rendererObj.scene = new THREE.Scene();


var twod = sc.scenes.axial;
twod.renderer = new THREE.WebGLRenderer({
    antialias: true,
});
twod.domID = 'planarScenes';
twod.domEl = document.getElementById(twod.domID);
twod.renderer.autoClear = false;
twod.renderer.localClippingEnabled = true;
twod.renderer.setSize(
    twod.domEl.clientWidth,
    twod.domEl.clientHeight
);
twod.renderer.setClearColor(0x121212, 1);
twod.renderer.domElement.id = twod.targetID;
twod.domEl.appendChild(twod.renderer.domElement);

// camera
twod.camera = new AMI.OrthographicCamera(
    twod.domEl.clientWidth / -2,
    twod.domEl.clientWidth / 2,
    twod.domEl.clientHeight / 2,
    twod.domEl.clientHeight / -2,
    1,
    1000
);

// controls
twod.controls = new AMI.TrackballOrthoControl(twod.camera, twod.domEl);
twod.controls.staticMoving = true;
twod.controls.noRotate = true;
twod.camera.controls = twod.controls;

// scene
twod.scene = new THREE.Scene();

twod.renderer.render(twod.scene,twod.camera);



function animate2() {
    twod.renderer.render(twod.scene,twod.camera);

    // request new frame
    requestAnimationFrame(function() {
      animate2();
    });
}

animate2();



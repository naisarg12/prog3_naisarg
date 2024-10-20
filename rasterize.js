/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog3/triangles.json"; // triangles file loc
var Eye = vec4.fromValues(0.5, 0.5, -0.5, 1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // buffer for vertex coordinates
var vertexPositionAttrib; // where to put position for vertex shader
var diffuseColorUniform; // where to put diffuse color for fragment shader
var modelViewMatrixUniform, projectionMatrixUniform; // shader uniforms for matrices
var inputTriangles; // global variable to hold the triangle data

// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url, descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET", url, false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now() - startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open " + descr + " file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
}

// set up the webGL environment
function setupWebGL() {
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    
    catch(e) {
      console.log(e);
    } // end catch
}

function loadTriangles() {
    inputTriangles = getJSONFile(INPUT_TRIANGLES_URL, "triangles");
    if (inputTriangles != String.null) {
        var coordArray = []; // 1D array to hold vertex coords for WebGL

        for (var whichSet = 0; whichSet < inputTriangles.length; whichSet++) {
            for (var whichSetVert = 0; whichSetVert < inputTriangles[whichSet].vertices.length; whichSetVert++) {
                coordArray = coordArray.concat(inputTriangles[whichSet].vertices[whichSetVert]);
            }
        }

        vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coordArray), gl.STATIC_DRAW);
    } else {
        console.log("Error loading triangles data.");
    }
}

function setupShaders() {
    var fShaderCode = `
    precision mediump float;
    uniform vec3 diffuseColor;

    void main(void) {
        gl_FragColor = vec4(diffuseColor, 1.0);
    }
`;
    
    var vShaderCode = `
    attribute vec3 vertexPosition;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    void main(void) {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(vertexPosition, 1.0);
    }
`;

    try {
        var fShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fShader, fShaderCode);
        gl.compileShader(fShader);

        var vShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vShader, vShaderCode);
        gl.compileShader(vShader);
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else {
            var shaderProgram = gl.createProgram();
            gl.attachShader(shaderProgram, fShader);
            gl.attachShader(shaderProgram, vShader);
            gl.linkProgram(shaderProgram);

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else {
                diffuseColorUniform = gl.getUniformLocation(shaderProgram, "diffuseColor");
                modelViewMatrixUniform = gl.getUniformLocation(shaderProgram, "modelViewMatrix");
                projectionMatrixUniform = gl.getUniformLocation(shaderProgram, "projectionMatrix");

                gl.useProgram(shaderProgram);
                vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "vertexPosition"); 
                gl.enableVertexAttribArray(vertexPositionAttrib);
            }
        }
    } catch(e) {
        console.log(e);
    }
}

function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vertexPositionAttrib);

    var modelViewMatrix = mat4.create();
    mat4.lookAt(modelViewMatrix, [0.5, 0.5, -0.5], [0.5, 0.5, 0], [0, 1, 0]);  // Eye, Center, Up

    var projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, 1, 0.1, 100);  // fov, aspect, near, far

    gl.uniformMatrix4fv(modelViewMatrixUniform, false, modelViewMatrix);
    gl.uniformMatrix4fv(projectionMatrixUniform, false, projectionMatrix);

    var indexOffset = 0;
    for (var whichSet = 0; whichSet < inputTriangles.length; whichSet++) {
        var currentDiffuse = inputTriangles[whichSet].material.diffuse;
        gl.uniform3fv(diffuseColorUniform, currentDiffuse);

        var numTriangles = inputTriangles[whichSet].triangles.length;
        gl.drawArrays(gl.TRIANGLES, indexOffset, numTriangles * 3);
        indexOffset += numTriangles * 3;
    }

    requestAnimationFrame(renderTriangles);
}

function main() {
    setupWebGL();
    loadTriangles();
    setupShaders();
    renderTriangles();
}

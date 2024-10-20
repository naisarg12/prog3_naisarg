/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog3/triangles.json"; // triangles file loc
const INPUT_ELLIPSOIDS_URL = "https://ncsucgclass.github.io/prog3/ellipsoids.json";
//const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog3/spheres.json"; // spheres file loc
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize; // the number of indices in the triangle buffer
var altPosition; // flag indicating whether to alter vertex positions
var vertexPositionAttrib; // where to put position for vertex shader
var altPositionUniform; // where to put altPosition flag for vertex shader


// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get input spheres

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
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
 
} // end setupWebGL

var vertexBuffer; // buffer for vertex coordinates
var triBufferSize; // number of indices in the buffer

function loadTriangles() {
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL, "triangles");
    if (inputTriangles != String.null) {
        var coordArray = []; // 1D array to hold vertex coords for WebGL

        for (var whichSet = 0; whichSet < inputTriangles.length; whichSet++) {
            // For each vertex, add coordinates to the coordArray
            for (var whichSetVert = 0; whichSetVert < inputTriangles[whichSet].vertices.length; whichSetVert++) {
                coordArray = coordArray.concat(inputTriangles[whichSet].vertices[whichSetVert]);
            }
        }

        // Create vertex buffer and transfer data to WebGL
        vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coordArray), gl.STATIC_DRAW);

        triBufferSize = coordArray.length / 3; // number of vertices
    } else {
        console.log("Error loading triangles data.");
    }
}
// setup the webGL shaders
function setupShaders() {
    
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
    precision mediump float;
    uniform vec3 diffuseColor;

    void main(void) {
        gl_FragColor = vec4(diffuseColor, 1.0); // set the color based on diffuse color
    }
`;
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
    attribute vec3 vertexPosition;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    void main(void) {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(vertexPosition, 1.0);
    }
`;

    
    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                
                // Now that the program is linked, retrieve the location of the diffuse color uniform
                var diffuseColorUniform = gl.getUniformLocation(shaderProgram, "diffuseColor");
                
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                vertexPositionAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "vertexPosition"); 
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array
                altPositionUniform = // get pointer to altPosition flag
                    gl.getUniformLocation(shaderProgram, "altPosition");
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
    altPosition = false;
    setTimeout(function alterPosition() {
        altPosition = !altPosition;
        setTimeout(alterPosition, 2000);
    }, 2000); // switch flag value every 2 seconds
} // end setup shaders
var bgColor = 0;
// render the loaded model
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear the frame and depth buffers

    bgColor = (bgColor < 1) ? (bgColor + 0.001) : 0;
    gl.clearColor(bgColor, 0, 0, 1.0); // update background color

    // Bind vertex buffer and pass to vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0); // send vertex positions
    gl.enableVertexAttribArray(vertexPositionAttrib); // enable vertex positions

    // Loop through each triangle set
    var indexOffset = 0; // offset to track vertices for each triangle set
    for (var whichSet = 0; whichSet < inputTriangles.length; whichSet++) {
        var currentDiffuse = inputTriangles[whichSet].material.diffuse; // get diffuse color
        gl.uniform3fv(diffuseColorUniform, currentDiffuse); // pass diffuse color to fragment shader

        // Draw the triangles for the current set
        var numTriangles = inputTriangles[whichSet].triangles.length; // number of triangles in the set
        gl.drawArrays(gl.TRIANGLES, indexOffset, numTriangles * 3); // draw the triangles
        indexOffset += numTriangles * 3; // update offset for next triangle set
    }

    requestAnimationFrame(renderTriangles); // continuous render loop
}


/* MAIN -- HERE is where execution begins after window load */

function main() {
  
  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); // setup the webGL shaders
  renderTriangles(); // draw the triangles using webGL
  
} // end main

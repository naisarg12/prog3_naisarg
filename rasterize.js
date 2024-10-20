/* GLOBAL CONSTANTS AND VARIABLES */

// assignment-specific globals
const WIN_Z = 0;
const WIN_LEFT = 0;
const WIN_RIGHT = 1;
const WIN_BOTTOM = 0;
const WIN_TOP = 1;
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog3/triangles.json"; // triangles file location
var Eye = new vec4.fromValues(0.5, 0.5, -0.5, 1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all-powerful gl object. It's all here!
var vertexBuffer; // contains vertex coordinates in triples
var colorBuffer; // contains diffuse colors of triangles
var triangleBuffer; // contains indices into vertexBuffer in triples
var triBufferSize; // number of indices in the triangle buffer
var vertexPositionAttrib; // where to put position for vertex shader
var vertexColorAttrib; // where to put color for fragment shader

// Set up the webGL environment
function setupWebGL() {
    var canvas = document.getElementById("myWebGLCanvas");
    gl = canvas.getContext("webgl");
    
    try {
        if (gl == null) throw "Unable to create gl context -- is your browser gl ready?";
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // clear color to black
        gl.clearDepth(1.0); // clear depth buffer
        gl.enable(gl.DEPTH_TEST); // enable depth testing
    } catch (e) {
        console.log(e);
    }
}

// Read triangles in, load them into webgl buffers
function loadTriangles() {
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL, "triangles");

    if (inputTriangles != String.null) {
        var coordArray = []; // vertex coordinates
        var colorArray = []; // diffuse color of each vertex

        for (var whichSet = 0; whichSet < inputTriangles.length; whichSet++) {
            var vertices = inputTriangles[whichSet].vertices;
            var colors = inputTriangles[whichSet].material.diffuse; // diffuse color

            for (var whichSetVert = 0; whichSetVert < vertices.length; whichSetVert++) {
                coordArray = coordArray.concat(vertices[whichSetVert]);

                // Adding the triangle color to colorArray
                colorArray = colorArray.concat(colors);
            }
        }

        // Load vertex buffer
        vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coordArray), gl.STATIC_DRAW);

        // Load color buffer
        colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorArray), gl.STATIC_DRAW);
    }
}

// Setup the webGL shaders
function setupShaders() {
    // Fragment shader: passes the color for each pixel
    var fShaderCode = `
        precision mediump float;
        varying vec3 vColor; // interpolated color from vertex shader
        void main(void) {
            gl_FragColor = vec4(vColor, 1.0); // set the fragment color
        }
    `;

    // Vertex shader: transforms vertex and passes color
    var vShaderCode = `
        attribute vec3 vertexPosition;
        attribute vec3 vertexColor;
        varying vec3 vColor;

        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;

        void main(void) {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(vertexPosition, 1.0); // transformed position
            vColor = vertexColor; // pass the color to the fragment shader
        }
    `;

    try {
        // Compile and attach fragment shader
        var fShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fShader, fShaderCode);
        gl.compileShader(fShader);

        // Compile and attach vertex shader
        var vShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vShader, vShaderCode);
        gl.compileShader(vShader);

        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
            throw "Fragment shader compile error: " + gl.getShaderInfoLog(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
            throw "Vertex shader compile error: " + gl.getShaderInfoLog(vShader);
        } else {
            var shaderProgram = gl.createProgram();
            gl.attachShader(shaderProgram, fShader);
            gl.attachShader(shaderProgram, vShader);
            gl.linkProgram(shaderProgram);

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                throw "Shader program linking error: " + gl.getProgramInfoLog(shaderProgram);
            } else {
                gl.useProgram(shaderProgram);
                
                vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "vertexPosition");
                gl.enableVertexAttribArray(vertexPositionAttrib);

                vertexColorAttrib = gl.getAttribLocation(shaderProgram, "vertexColor");
                gl.enableVertexAttribArray(vertexColorAttrib);
            }
        }
    } catch (e) {
        console.log(e);
    }
}

// Render the triangles
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Activate vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0);

    // Activate color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(vertexColorAttrib, 3, gl.FLOAT, false, 0, 0);

    // Set up model-view and projection matrices (for simplicity, using identity)
    var modelViewMatrix = mat4.create();
    var projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, 1, 0.1, 10.0);
    mat4.lookAt(modelViewMatrix, [0.5, 0.5, -0.5], [0.5, 0.5, 0], [0, 1, 0]);

    var shaderProgram = gl.getParameter(gl.CURRENT_PROGRAM);
    var modelViewMatrixLocation = gl.getUniformLocation(shaderProgram, "modelViewMatrix");
    var projectionMatrixLocation = gl.getUniformLocation(shaderProgram, "projectionMatrix");

    gl.uniformMatrix4fv(modelViewMatrixLocation, false, modelViewMatrix);
    gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);

    // Draw the triangles
    gl.drawArrays(gl.TRIANGLES, 0, triBufferSize);
}

// MAIN
function main() {
    setupWebGL();
    loadTriangles();
    setupShaders();
    renderTriangles();
}

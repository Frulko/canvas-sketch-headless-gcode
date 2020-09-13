const canvasSketch = require('canvas-sketch');
const { pathsToSVG, renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const math = require('canvas-sketch-util/math');
const {vec2} = require('gl-matrix')
const fs = require('fs');


const GCodeFile = require('./GCodeFile');



let circlePos = [];

// You can force a specific seed by replacing this with a string value
const defaultSeed = '';

// Set a random seed so we can reproduce this print later
Random.setSeed(Date.now());


const gCode = new GCodeFile({
	feedRate: 16000, // G1 movement (drawing speed)
  seekRate: 32000, // G0 movement (no drawing speed)
	onCommand: 'M03S90',
	offCommand: 'M03S20',
	powerDelay: 0.2,
	fileName: 'sketch',
	paperSize: [230, 340], // A4 size in mm
	margin: 0, // or [10, 10] (top/bottom and left/right margin) or [10,10,10,10] (top/left/bottom/right)
	flipX: false,
	flipY: false
})


const sketch = (props) => {

  const { width, height, units } = props;
  gCode.updateCoordsArea(width, height);
  // Holds all our 'path' objects
  // which could be from createPath, or SVGPath string, or polylines
  const paths = [];
  let points = [];

  for (let i = 0; i <= 100; i++) {
    const angle = math.mapRange(i, 0, 100, 0, 2 * Math.PI)
    const x = width/2 + Math.cos(angle) * 5;
    const y = height/2 + Math.sin(angle) * 5;
    points.push([x,y])
  }

  // [[0,0],[25,0],[25,32],[0,32],[0,0]].forEach((point) => {
  //   points.push(point);
  // });
  const rect = [[0,0],[23,0],[23,34],[0,34],[0,0]];
  paths.push(rect);

  console.log('path:', paths);
  // Convert the paths into polylines so we can apply line-clipping
  // When converting, pass the 'units' to get a nice default curve resolution
  let lines = pathsToPolylines(paths, { units });
  console.log('lines', lines);

  // Clip to bounds, using a margin in working units
  const margin = 0; // in working 'units' based on settings
  const box = [ margin, margin, width - margin, height - margin ];
  // lines = clipPolylinesToBox(lines, box);

  gCode.addPolylines(lines)


  return gCode.downloadFile();
};

const svg = sketch({width: 23, height:34,  units: 'cm', optimize: false});
fs.writeFile('./output.gcode', svg, (err) => {
    if (err) throw err;
    console.log('Data written to file');
});

d3.select(window).on("load", init);

var hands;

var dims;

function init() {
  dims = d3.select("svg").node().getBoundingClientRect(); // finding dims (height, width, x, y) after svg has been created
  d3.csv("hands.csv", function(data) {
    hands = data // bind to global variable
  });
  d3.text("hands_pca.csv", plotPCA);
}

function plotPCA(text) {
  var data = d3.csvParseRows(text).map(function(row) {
    return row.map(function(value) {
      return +value;
    });
  });
  console.log(data);

  /*
  var data2 = [];
  var point = {};
  for (i = 0; i < data.length; i++) { // loop 40 hands
    point.x = data[i][0]; // first feature
    point.y = data[i][1]; // second feature
    data2.push(point);
  }
  console.log(data2);
*/
  // setup x
  var xValue = function(d) { return d[0];}, // data -> value
    xScale = d3.scaleLinear().range([0, dims.width]), // value -> display
    xMap = function(d) { return xScale(xValue(d));}; // data -> display
    //xAxis = d3.svg.axis().scale(xScale).orient("bottom");

  // setup y
  var yValue = function(d) { return d[1];}, // data -> value
    yScale = d3.scaleLinear().range([dims.height, 0]), // value -> display
    yMap = function(d) { return yScale(yValue(d));}; // data -> display
    //yAxis = d3.svg.axis().scale(yScale).orient("left");

  // plotting points
  d3.select("#PCA")
    .selectAll(".dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx",xMap)
    .attr("cy",yMap)
    .attr("r",1)
}

function plotHand(data) {

}
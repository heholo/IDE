d3.select(window).on("load", init);

var hands;

var dims;

const margin = {
  top: 50,
  bottom: 50,
  left: 85,
  right: 50,
}

const padding = 30;

function init() {
  dims = d3.select("svg").node().getBoundingClientRect(); // finding dims (height, width, x, y) after svg has been created
  d3.csv("hands.csv", function(data) {
    hands = data // bind to global variable
  });
  d3.text("hands_pca.csv", plotPCA);
}

function plotPCA(text) {
  // handling data
  var data = d3.csvParseRows(text).map(function(row) {
    return row.map(function(value) {
      return +value;
    });
  });
  console.log(data);

  // plot area
  var svg = d3.select('#week4')
    .attr('width', dims.width + margin.left + margin.right)
    .attr('height', dims.height + margin.top + margin.bottom)
//    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // setup x
  var xValue = function(d) { return d[0];}, // data -> value
    xScale = d3.scaleLinear().range([0, dims.width]).domain(d3.extent(data, xValue)), // value -> display
    xMap = function(d) { return xScale(xValue(d));}; // data -> display

  // setup y
  var yValue = function(d) { return d[1];}, // data -> value
    yScale = d3.scaleLinear().range([dims.height, 0]).domain(d3.extent(data, yValue)), // value -> display
    yMap = function(d) { return yScale(yValue(d));}; // data -> display

  // x-axis
  var xAxis = d3.axisBottom()
    .scale(xScale);
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + padding + ",0)")
    .call(xAxis);

  // y-axis
  var yAxis = d3.axisLeft()
    .scale(yScale);
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + padding + ",0)")
    .call(yAxis);

  // plotting points
  svg.selectAll(".dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx",xMap)
    .attr("cy",yMap)
    .attr("r",3.5)
}

function plotHand(data) {

}
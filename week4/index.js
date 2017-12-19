d3.select(window).on("load", init);

var hands;
var currentHands = []
var dims;

const marginPCA = {
  top: 20,
  bottom: 30,
  left: 10,
  right: 30,
}

function init() {
  dims = d3.select("svg").node().getBoundingClientRect(); // finding dims (height, width, x, y) after svg has been created
  d3.text("hands.csv", function(data) {
    var parsed = d3.csvParseRows(data)

    hands = parsed.map(function (r, i) {
      const length = r.length
      const data = []

      for (var j = 0; j < r.length / 2; j++) {
        data.push({
          x: +r[j],
          y: +r[j + length/2]
        })
      }
      return {
        key: i,
        data
      }
    })

  });
  d3.text("hands_pca.csv", plotPCA);
  initHands();

  d3.select("a.left").on("click", function () {
    currentHands = [30, 20, 10, 38].map((i) => hands[i])
    plotHands(currentHands)
  })
  d3.select("a.right").on("click", function () {
    currentHands = [25, 15, 5, 35].map((i) => hands[i])
    plotHands(currentHands)
  })
  d3.select("a.top").on("click", function () {
    currentHands = [37].map((i) => hands[i])
    plotHands(currentHands)
  })
  d3.select("a.bottom").on("click", function () {
    currentHands = [39].map((i) => hands[i])
    plotHands(currentHands)
  })

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
  var svg = d3.select('#PCA')
//    .attr('width', dims.width + margin.left + margin.right)
//    .attr('height', dims.height + margin.top + margin.bottom)
    .attr('transform', `translate(${marginPCA.left + dims.width/2}, ${marginPCA.top})`);

  // setup x
  var xValue = function(d) { return d[0];}, // data -> value
    xScale = d3.scaleLinear().range([marginPCA.left, dims.width/2 - marginPCA.right]).domain(d3.extent(data, xValue)), // value -> display
    xMap = function(d) { return xScale(xValue(d));}; // data -> display

  // setup y
  var yValue = function(d) { return d[1];}, // data -> value
    yScale = d3.scaleLinear().range([dims.height - marginPCA.top - marginPCA.bottom, 0]).domain(d3.extent(data, yValue)), // value -> display
    yMap = function(d) { return yScale(yValue(d));}; // data -> display

  // x-axis
  var xAxis = d3.axisBottom()
    .scale(xScale);

  svg.append("g")
    .attr("class", "axis")
    .call(xAxis)
    .attr('transform', `translate(${0}, ${dims.height - marginPCA.bottom - marginPCA.top})`);

  // y-axis
  var yAxis = d3.axisLeft()
    .scale(yScale);

  svg.append("g")
    .attr("class", "axis")
    .call(yAxis)
    .attr('transform', `translate(${marginPCA.left}, ${0})`);

    // plotting points
  svg.selectAll(".dot")
     .data(data, function(data,i) {return i})
     .enter()
     .append("circle")
     .attr("class", "dot")
     .attr("cx",xMap)
     .attr("cy",yMap)
     .attr("r",3.5)
     .style("fill", (d, i) => handsColor(i))
     .on("click", function(d,i) {
       const id = currentHands.indexOf(hands[i])
       if (id < 0) {
         currentHands.push(hands[i])
       } else {
         currentHands.splice(id, 1)
       }
         plotHands(currentHands)
     })
     .append("title")
     .text(function(d,i) {
         return "Hand " + i;
     });
}


var handsMargin = {
  top: 20,
  bottom: 20,
  right: 20,
  left: 20
}

var handsX;
var handsY;

const handsColor = d3.scaleOrdinal(d3.schemeCategory20);

function initHands() {
  d3.select("#hand")
    .attr('transform',
          `translate(${handsMargin.left}, ${handsMargin.top})`)
  handsX = d3.scaleLinear().range([0, dims.width/2 - handsMargin.left - handsMargin.right]);
  handsY = d3.scaleLinear().range([dims.height - handsMargin.top - handsMargin.bottom, 0]);

}

function plotHands(hands) {
  const data = d3.select("#hand")
                 .selectAll(".hands")
                 .data(hands, (d) => d.key);


  const flat = hands.reduce(function (acc, x) {
    return acc.concat( x.data)
  }, [])
  console.log(flat)
  handsX.domain(d3.extent(flat,
                          function (d) { return  d.x }));

  handsY.domain(d3.extent(flat,
                          (d) => d.y));

  const lineFun = d3.line().
                     x(function (d) {
                       return handsX(d.x)
                     })
                    .y(function (d) {
                      return handsY(d.y)
                    });
  data.enter()
      .append('g')
      .attr('class', 'hands')
      .append('path')
      .attr('d', function (d) {
        console.log(d)
        return lineFun(d.data);
      })
      .style('stroke', function (d, i) {
        console.log(d.key)
        console.log(handsColor(d.key))
        return handsColor(d.key)
      });

  const indices = hands.map((d) => d.key)
  d3.select("#PCA")
    .selectAll(".dot")
    .classed("selected", (d, i) => indices.indexOf(i) >= 0)
  
  data.exit()
      .remove()
}

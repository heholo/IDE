d3.select(window).on("load", init);

var hands;

var dims;

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

  data.exit()
      .remove()
}

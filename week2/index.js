d3.select(window).on('load', init);

function init() {
    d3.text('kobenhavn', handleData);
}

const margin = {
    top: 50,
    bottom: 50,
    left: 85,
    right: 50,
}


const dims = {
    width: 800 - margin.left - margin.right,
    height: 350 - margin.top - margin.bottom,
}


function plotTemperatureData(d) {
    var svg = d3.select('#plotarea')
                .attr('width', dims.width + margin.left + margin.right)
                .attr('height', dims.height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Define ranges
    var x = d3.scaleTime().range([0, dims.width]);
    var y = d3.scaleLinear().range([dims.height, 0]);


    // Scale the range of the data
    x.domain(d3.extent(d, function(d) { return d.YEAR; }));
    y.domain([5, d3.max(d, function(d) { return d.metANN; })]);

    var valueline = d3.line()
                      .x(function(d) { return x(d.YEAR); })
                      .y(function(d) { return y(d.metANN); });

    // Add the valueline path.
    svg.append('path')
       .attr('class', 'line')
       .attr('d', valueline(d));

    // Add the X Axis
    svg.append('g')
       .attr('class', 'x axis')
       .attr('transform', 'translate(0,' + dims.height + ')')
       .call(d3.axisBottom(x));

    // text label for the x axis
    svg.append('text')
       .attr('transform',
             `translate(${dims.width/2}, ${dims.height + margin.bottom/1.3})`)
       .style('text-anchor', 'middle')
       .text('Year');

    // Add the Y Axis
    svg.append('g')
       .attr('class', 'y axis')
       .call(d3.axisLeft(y));

    // text label for the y axis
    svg.append('text')
       .attr('transform', 'rotate(-90)')
       .attr('y',  - margin.left / 1.5)
       .attr('x', 0 - (dims.height / 2))
       .attr('dy', '1em')
       .style('text-anchor', 'middle')
       .text('Temperature (°C)');

    // Title
    svg.append('text')
       .attr('y', 5 - margin.top)
       .attr('x', dims.width/2)
       .attr('dy', '2em')
       .style('text-anchor', 'middle')
       .text('Mean Annual Temperature (Copenhagen)');

    // Trendline
    var leastSquaresCoeff = leastSquares(d.map((e) => e.YEAR.getTime()), d.map((e) => e.metANN));
    console.log(leastSquaresCoeff)
    // apply the reults of the least squares regression
    var x1 = d[0].YEAR;
    var y1 = leastSquaresCoeff[0] * x1 + leastSquaresCoeff[1];
    var x2 = d[d.length - 1].YEAR;
    var y2 = leastSquaresCoeff[0] * x2 + leastSquaresCoeff[1];
    var trendData = [[x1,y1],[x2,y2]];
    console.log(trendData)
    var trendLine = d3.line()
        .x( d => x(d[0]))
        .y( d => y(d[1]))

    svg.selectAll(".trendline")
        .data(trendData)
        .enter()
        .append("path")
        .attr("class","trendline")
        .attr("d",trendLine(trendData))
}

function plotTemperatureDifference(d) {
    var svg = d3.select('#temperature-difference')
                .attr('width', dims.width + margin.left + margin.right)
                .attr('height', dims.height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Define ranges
    var x = d3.scaleTime().range([0, dims.width]);
    var y = d3.scaleLinear().range([dims.height, 0]);


    // Scale the range of the data
    x.domain(d3.extent(d, function(d) { return d.YEAR; }));
    y.domain([10, d3.max(d, function(d) { return d.diff; })]);

    var valueline = d3.line()
                      .x(function(d) { return x(d.YEAR); })
                      .y(function(d) { return y(d.diff); });

    // Add the valueline path.
    svg.append('path')
       .attr('class', 'line')
       .attr('d', valueline(d));


    // Add the X Axis
    svg.append('g')
       .attr('class', 'x axis')
       .attr('transform', 'translate(0,' + dims.height + ')')
       .call(d3.axisBottom(x));

    // text label for the x axis
    svg.append('text')
       .attr('transform',
             `translate(${dims.width/2}, ${dims.height + margin.bottom/1.3})`)
       .style('text-anchor', 'middle')
       .text('Year');

    // Add the Y Axis
    svg.append('g')
       .attr('class', 'y axis')
       .call(d3.axisLeft(y));

    // text label for the y axis
    svg.append('text')
       .attr('transform', 'rotate(-90)')
       .attr('y', 0 - margin.left / 1.5)
       .attr('x', 0 - (dims.height / 2))
       .attr('dy', '1em')
       .style('text-anchor', 'middle')
       .text('Temperature Difference');

    // Title
    svg.append('text')
       .attr('y', 5 - margin.top)
       .attr('x', dims.width/2)
       .attr('dy', '1em')
       .style('text-anchor', 'middle')
       .text('Difference Between Summer and Winter');

    // Trendline
    var leastSquaresCoeff = leastSquares(d.map((e) => e.YEAR.getFullYear()), d.map((e) => e.diff));
    console.log(leastSquaresCoeff)
    // apply the reults of the least squares regression
    var x1 = d[0].YEAR;
    var y1 = leastSquaresCoeff[0] * x1.getFullYear() + leastSquaresCoeff[1];
    var x2 = d[d.length - 1].YEAR;
    var y2 = leastSquaresCoeff[0] * x2.getFullYear() + leastSquaresCoeff[1];
    var trendData = [[x1,y1],[x2,y2]];
    console.log(trendData)
    var trendLine = d3.line()
        .x( d => x(d[0]))
        .y( d => y(d[1]))

    svg.selectAll(".trendline")
        .data(trendData)
        .enter()
        .append("path")
        .attr("class","trendline")
        .attr("d",trendLine(trendData))

}

var parseTime = d3.timeParse('%Y');

// returns slope, intercept and r-square of the line
function leastSquares(xSeries, ySeries) {
    var reduceSumFunc = function(prev, cur) { return prev + cur; };

    var xBar = xSeries.reduce(reduceSumFunc) * 1.0 / xSeries.length;
    var yBar = ySeries.reduce(reduceSumFunc) * 1.0 / ySeries.length;

    var ssXX = xSeries.map(function(d) { return Math.pow(d - xBar, 2); })
        .reduce(reduceSumFunc);

    var ssYY = ySeries.map(function(d) { return Math.pow(d - yBar, 2); })
        .reduce(reduceSumFunc);

    var ssXY = xSeries.map(function(d, i) { return (d - xBar) * (ySeries[i] - yBar); })
        .reduce(reduceSumFunc);

    var slope = ssXY / ssXX;
    var intercept = yBar - (xBar * slope);
    var rSquare = Math.pow(ssXY, 2) / (ssXX * ssYY);

    return [slope, intercept, rSquare];
}

function handleData(d) {
    const parser = d3.dsvFormat(' ');
    var parsed = parser.parse(d.replace(/[ ]+/g, ' '));
    console.log(parsed)
    parsed.forEach(function(d) {
        d.metANN = Number(d.metANN);
        d.winter = Number(d['D-J-F']);
        d.summer= Number(d['J-J-A']);
        d.diff = d.summer - d.winter;
        d.YEAR = parseTime(d.YEAR);
    });


    plotTemperatureData(parsed.filter(d => d.metANN < 900 && !!d.YEAR));
    plotTemperatureDifference(parsed.filter(d => d.diff < 900 && !!d.YEAR));
}

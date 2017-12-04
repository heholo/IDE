
d3.select(window).on('load', init);

function init() {
    d3.text('kobenhavn', handleData);
}

const margin = {
    top: 20,
    bottom: 50,
    left: 100,
    right: 100,
}


const dims = {
    width: 1200 - margin.left - margin.right,
    height: 450 - margin.top - margin.bottom,
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
    y.domain([0, d3.max(d, function(d) { return d.metANN; })]);

    var valueline = d3.line()
                      .x(function(d) { return x(d.YEAR); })
                      .y(function(d) { return y(d.metANN); });

    // Add the valueline path.
    svg.append("path")
       .attr("class", "line")
       .attr("d", valueline(d));

    // Add the X Axis
    svg.append("g")
       .attr("class", "x axis")
       .attr("transform", "translate(0," + dims.height + ")")
       .call(d3.axisBottom(x));

    // text label for the x axis
    svg.append("text")             
       .attr("transform",
             "translate(" + (dims.width/2) + " ," + 
                            (dims.height + margin.top + 20) + ")")
       .style("text-anchor", "middle")
       .text("Year");

    // Add the Y Axis
    svg.append("g")
       .attr("class", "y axis")
       .call(d3.axisLeft(y));

    // text label for the y axis
    svg.append("text")
       .attr("transform", "rotate(-90)")
       .attr("y", 0 - margin.left/2)
       .attr("x", 0 - (dims.height / 2))
       .attr("dy", "1em")
       .style("text-anchor", "middle")
       .text("Temperature");      

}

var parseTime = d3.timeParse('%Y');

function handleData(d) {
    const parser = d3.dsvFormat(' ');
    var parsed = parser.parse(d.replace(/[ ]+/g, ' '));

    parsed.forEach(function(d) {
        d.metANN = Number(d.metANN);
        d.YEAR = parseTime(d.YEAR);
        console.log(d.YEAR);
    });

    parsed = parsed.filter(d => d.metANN < 900 && !!d.YEAR)
    plotTemperatureData(parsed);
}

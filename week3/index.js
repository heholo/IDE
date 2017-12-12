d3.select(window).on('load', init);

function init() {
    d3.json('trump_family.json', handleData);
}

const margin = {
    top: 80,
    bottom: 50,
    left: 20,
    right: 20,
}


const dims = {
    width: 1250 - margin.left - margin.right,
    height: 450 - margin.top - margin.bottom,
}

var nodes
var tree = d3.tree()
             .size([dims.width, dims.height])

tree.separation(function (a, b) {
    if (a.parent == b.parent) {
        return 0.1 * Math.max(a.data.name.length,
                              b.data.name.length)
    }

    return 2
    
})

function handleData(data) {
    console.log(data)
    initTree(data)

}

function initTree(data) {

    nodes = d3.hierarchy(data, function (d) {
        return d.children ? d.children : d.partners
    })


    tree(nodes)

    var svg = d3.select('#tree')
                .attr('width', dims.width + margin.left + margin.right)
                .attr('height', dims.height + margin.top + margin.bottom)
    var g = svg.append('g')
               .attr('transform',
                     `translate(${margin.left}, ${margin.top})`)
    
    var legend = svg.append('g')
                    .attr('transform',
                          `translate(${margin.left}, ${margin.top / 4})`)
                    .attr('class', 'legend')
    legend.append('rect')
                    .attr('width', dims.width * 0.15)
                    .attr('height', dims.height * 0.17)
                    .attr('rx', 12).attr('ry', 12)

    legend.append('text').attr("dy", ".35em")
                    .attr("y", 15)
                    .attr("x", 10)
                    .text("Partner");

    legend.append('line')
          .attr("class", "link spouse")
          .attr('x1', 70).attr('x2', 170)
          .attr('y1', 15).attr('y2', 15)

    legend.append('text').attr("dy", ".35em")
          .attr("y", 40)
          .attr("x", 10)
          .text("Child of");

    legend.append('line')
          .attr("class", "link")
          .attr('x1', 70).attr('x2', 170)
          .attr('y1', 40).attr('y2', 40)

    // adds the links between the nodes
    var link = g.selectAll(".link")
                .data( nodes.descendants().slice(1))
                .enter().append("path")
                .attr("class", function (d) {
                    var cls = "link"
                    if (d.parent.data.partners) {
                        cls += " spouse"
                    }
                    return cls
                })
                .attr("d", function(d) {
                    return "M" + d.x + "," + d.y
                         + "C" + d.x + "," + (d.y + d.parent.y) / 2
                         + " " + d.parent.x + "," +  (d.y + d.parent.y) / 2
                         + " " + d.parent.x + "," + d.parent.y;
                });
    
    // adds each node as a group
    var node = g.selectAll(".node")
                .data(nodes.descendants())
                .enter().append("g")
                .attr("class", function(d) { 
                    return "node" + 
                (d.children ? " node--internal" : " node--leaf") +
                (!d.parent ? " root" : ""); })
                .attr("transform", function(d) { 
                    return "translate(" + d.x + "," + d.y + ")"; });
    
    // adds the circle to the node
    node.append("circle")
        .attr("r", function (d) {
            return d.data.name == "Donald Trump" ? 40 : 15
        });

    // adds the text to the node
    node.append("text")
        .attr("dy", function(d) {
            if (!d.parent) return ".35em"
            return ".35em"
        })
        .attr("y", function(d) {
            if (!d.parent) return -55
            return d.children || d.depth != nodes.height ? -25 : 25; })
        .style("text-anchor", "middle")
        .text(function(d) { return d.data.name; });
}

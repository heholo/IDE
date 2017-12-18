d3.select(window).on('load', init);

var hands;

var dims;

function init() {
  dims=d3.select("svg").node().getBBox(); // finding dimensions
  d3.csv('hands.csv', function(data) {
    hands = data // bind to global variable
  });
  d3.csv('hands_pca.csv', plotPCA);
}

function plotPCA(data) {

}

function plotHand(data) {

}
d3.select(window).on("load", init);

// global variables

const margin = {
  top: 20,
  bottom: 30,
  left: 10,
  right: 30,
}

// function init

function init() {
  $.getJSON('data/ghetto.json', function(d) {
    console.log(d)
  });
  //var ghetto = JSON.parse(ghetto);
}

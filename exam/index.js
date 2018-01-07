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
  d3.json("data/ghetto.json", function(data) {
    console.log(data);
  });
}

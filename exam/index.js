d3.select(window).on("load", init);

// global variables

const margin = {
  top: 20,
  bottom: 30,
  left: 10,
  right: 30,
}

var ghettos
var munis
var regions

// function init

function init() {
  d3.queue()
    .defer(d3.json, "data/ghetto.json")
    .defer(d3.csv, "data/muni_pop.csv")
    .defer(d3.csv, "data/muni_emp.csv")
    .defer(d3.csv, "data/muni_foreigners.csv")
    .defer(d3.csv, "data/muni_edu.csv")
    .defer(d3.csv, "data/muni_income.csv")
    .defer(d3.csv, "data/muni_crime.csv")
    .defer(d3.csv, "data/reg_crime.csv")
    .defer(d3.csv, "data/reg_income.csv")
    .await(_init)
}

/*
 * Create an object containing total and year by year
 * population by muni 
 **/
function collect_pops(pop) {
  var res = {}
  var years = pop.columns.slice(2)
  years.forEach(function (o) {
    res[o] = []
  })

  var tmp = {}

  pop.forEach(function(o) {
    if (!tmp[o.municipality])  {
      tmp[o.municipality] = {}
      years.forEach(function (y) {
        tmp[o.municipality][y] = {
          population: {
            agegroups: {},
            total: 0,
          },
          municipality: o.municipality,
          id: o.municipality
        }
      })
    }

    years.forEach(function (y) {
      tmp[o.municipality][y].population.total += o[y] - 0 
      tmp[o.municipality][y].population.agegroups[o.age] =  o[y] - 0
    })
  })
  var munis = Object.keys(tmp)

  years.forEach(function (y) {
    munis.forEach(function (m) {
      res[y].push(tmp[m][y])
    })
  })
  
  return res
}

function _init(err, ghetto, pop, emp, foreigners, edu, income, crime, reg_crime, reg_income) {
  console.log(ghetto)
  console.log(pop)
  console.log(emp)
  console.log(foreigners)
  console.log(edu)
  console.log(income)
  console.log(crime)
  console.log(reg_crime)
  console.log(reg_income)

  ghettos = ghetto
  munis = collect_pops(pop)
  
  regions = {}
  console.log(munis)
}

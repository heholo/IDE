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

  pop.forEach(function(o) {
    if (!res[o.municipality])  {
      res[o.municipality] = {
        agegroups: {},
        total: 0,
        municipality: o.municipality
      }
    }
    // sum
    // res[o.municipality].total += 0
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
}

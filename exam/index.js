d3.select(window).on("load", init);

// global variables

var ghettos
var munis
var regions


function objectSort(a, b) {
  a.id.localeCompare(b.id)
}
// function init

function init() {
  d3.queue()
    .defer(d3.json, "data/ghetto.json")
    .defer(d3.csv,  "data/muni_pop.csv")
    .defer(d3.csv,  "data/muni_emp.csv")
    .defer(d3.csv,  "data/muni_foreigners.csv")
    .defer(d3.csv,  "data/muni_edu.csv")
    .defer(d3.csv,  "data/muni_income.csv")
    .defer(d3.csv,  "data/muni_crime.csv")
    .defer(d3.csv,  "data/reg_crime.csv")
    .defer(d3.csv,  "data/reg_income.csv")
    .await(_init)
}

/*
 * Create an object containing total and year by year
 * population by muni
 **/
function collectPops(pop) {
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
    res[y].sort(objectSort)

    var map = {}
    res[y].forEach(function (o, i) {
      map[o.id] = i
    })

    res[y].get = function (k) {
      return this[map[k]]
    }
  })

  return res
}

/*
 * Gets the total age range frequency of the employee data
 */
function collectEmp(munis, emp) {

  var years = Object.keys(munis)
  // Make an empty object for each muni
  years.forEach(function (y) {
    munis[y].forEach(function (m) {
      m.employment = {
        _total_pop: 0,
        _total_emp: 0,
        freq: undefined,
      }
    })
  })
  var empYears = years.slice(0, -2)  // we don't have data for 2016/7

  // Now load the raw data by multiplying the frequencies with the population of the age range
  emp.forEach(function (e) {
    empYears.forEach(function (y) {
      var muni = munis[y].get(e.municipality)

      const freq = e[y] - 0

      const aStart = e["age-start"] - 0
      const aEnd = e["age-end"] - 0

      // Get total population by adding ages in age range (both inclusive)
      var totalPop = 0

      for (var i = aStart; i <= aEnd; i++) {
        totalPop += muni.population.agegroups[i]
      }

      // Insert raw data
      muni.employment._total_pop += totalPop
      muni.employment._total_emp += totalPop * freq / 100

    })
  })

  // Now iterate over munis and divide raw data
  // And also take average over last two years (if there)
  var y
  for (var i = 0; i < years.length; i++) {
    y = years[i]

    munis[y].forEach(function (m) {
      if (m.employment._total_pop) {
        m.employment.freq = m.employment._total_emp / m.employment._total_pop
      }
      // look two years back for avg
      var n = 0
      var tot = 0
      for (var j = Math.max(0, i - 2); j < i; j++) {
        var y2 = years[j]
        if (munis[y2].get(m.id).employment.freq) {
          n += 1
          tot += munis[y2].get(m.id).employment.freq
        }
      }

      m.employment.twoYearAvg = n ? tot/n : undefined
      m.unemployed = (1 - m.employment.twoYearAvg) * 100
    })
  }

}
/*
 * Collects the foreigner data -- only thing that needs to be done here
 * is to combine the two types of "foreigners" when both have been recorded
 */
function collectForeigners(munis, foreigners) {
  var years = Object.keys(munis)

  const typeMap = {
    "Indvandrere": "immigrants",
    "Efterkommere": "descendants"
  }

  var muni
  var type
  foreigners.forEach(function (f) {
    years.forEach(function (y) {
      muni = munis[y].get(f.municipality)

      // Init foreigners in muni
      if (!muni.foreigners) muni.foreigners = { total: 0 }

      type = typeMap[f.type]

      muni.foreigners[type] = f[y] - 0
      muni.foreigners.total += f[y] - 0

      if (muni.foreigners.immigrants && muni.foreigners.descendants) {
        muni.foreigners.freq = muni.foreigners.total / muni.population.total
        muni.immigrants = muni.foreigners.freq * 100
      }
    })
  })
}

function collectEducation(munis, edu) {
  var years = Object.keys(munis)

  edu.forEach(function (e) {
    var muni = munis[e.year].get(e.municipality)

    if (!muni.education) muni.edu = {}

    if (e.type == "Procent") {
      muni.education = e.value - 0
      muni.edu.freq = muni.education / 100
    } else if (e.part == "Uuddannet") {
      muni.edu.uneducated = e.value - 0
    } else {
      muni.edu.total = e.value - 0
    }
  })

}

/*
 * Collects the crime data 
 * total is divided by pop for each year
 */
function collectCrime(munis, crime) {
  var years = Object.keys(munis)
  crime.forEach(function (c) {
    years.forEach(function (y, i) {
      var muni = munis[y].get(c.municipality)
      muni.crime = { totalProsecuted: c[y] - 0 }
      muni.crime.freq = muni.crime.totalProsecuted / muni.population.total
      var n = 0
      var tot = 0
      for (var j = Math.max(0, i - 2); j < i; j++) {
        var y2 = years[j]
        if (munis[y2].get(muni.id).crime.freq) {
          n += 1
          tot += munis[y2].get(muni.id).crime.freq
        }
      }
      muni.prosecuted = n ? 100 * tot / n : undefined
    })
  })
}

function plot2(ghettos, munis) {

  // to-do: expand data. currently only 2015
  // filter ghetto = true
  function ghettoFilter(obj) {
    return obj.ghetto
  }
  var g = ghettos[2015].filter(ghettoFilter)

  // list of unique municipalities of the ghettos
  var muniList = [...new Set(g.map(item => item.municipality))]
  console.log(g)
  console.log(muniList)

  // filter munis
  function muniFilter(obj) {
    if (muniList.indexOf(obj.municipality) >= 0) {
      return true
    } else {
      return false
    }
  }
  var m = munis[2015].filter(muniFilter)
  console.log(m)

  // number of ghettos in each municipality
  muniGhettoN = []
  g.forEach(function(item) {
    t = muniList.indexOf(item.municipality)
    if (isNaN(muniGhettoN[t])) {
      muniGhettoN[t] = 1
    } else {muniGhettoN[t] ++}
  })
  console.log(muniGhettoN)

  function compareMuni(a, b) {
    // by number of ghettos in municipality
    an = muniGhettoN[muniList.indexOf(a.municipality)]
    bn = muniGhettoN[muniList.indexOf(b.municipality)]
    if (an > bn) {
      return -1
    }
    else if (an < bn) {
      return 1
    }
    else {return 0}
  }
  m.sort(compareMuni)

  // initialize data array
  data = []
  // fill
  m.forEach(function(i) {
    data.push(i)
    g.forEach(function(t) {
      if (t.municipality === i.municipality) {
        data.push(t)
      }
    })
  })

  // defining margin
  const margin = {
    top: 20,
    bottom: 150,
    left:30,
    right: 30,
  }

  // defining dimensions of the 5 subplots
  const dim = {
    w: 700 - margin.left - margin.right,
    h: 280 - margin.top - margin.bottom,
  }

  // selecting plot area
  var svg = d3.select('#plot2')
    .attr('width', dim.w + margin.left + margin.right)
    .attr('height', dim.h + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // define scales
  var xScale = d3.scaleBand() // to-do: add the ordering (muni-ghettos, muni-ghettos ...)
    .domain(data.map(function(d) { return d.id }))
    .range([0, dim.w])
    .padding(0.1)
  var ySpan =  d3.max(data, function(d) { return d.unemployed }) - d3.min(data, function(d) { return d.unemployed })
  var yScale = d3.scaleLinear()
    .domain([d3.min(data, function(d) { return d.unemployed }) - ySpan * 0.1,
      d3.max(data, function(d) { return d.unemployed }) + ySpan * 0.1])
    .range([dim.h, 0])

  // adding bars
  svg.selectAll("bar")
    .data(data)
    .enter().append("rect")
    .style("fill", function(d) {if (d.ghetto === true) {return "red"} else {return "steelblue"}})
    .attr("x", function(d) { return xScale(d.id); })
    .attr("width", xScale.bandwidth)
    .attr("y", function(d) { return yScale(d.unemployed); })
    .attr("height", function(d) { return dim.h - yScale(d.unemployed); });

  // adding axis
  var xAxis = d3.axisBottom()
    .scale(xScale)
  var yAxis = d3.axisLeft()
    .scale(yScale)
    .ticks(5)
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + dim.h + ")")
    .call(xAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", "-.55em")
    .attr("transform", "rotate(-90)" );
  svg.append("g")
    .call(yAxis)

  // to-do: adding cut-off line
  svg.append("line")
    .attr("x1",0)
    .attr("y1",yScale(40))
    .attr("x2",dim.w)
    .attr("y2",yScale(40))
    .attr("stroke-width", 1)
    .attr("stroke", "black")
    .attr("stroke-dasharray", "4,10")

  // to-do: adding title and other stuff

}

function _init(err, ghetto, pop, emp, foreigners, edu, income, crime, reg_crime, reg_income) {
  console.log("ghetto")
  console.log(ghetto)
  console.log("pop")
  console.log(pop)
  console.log("emp")
  console.log(emp)
  console.log("foreigners")
  console.log(foreigners)
  console.log("edu")
  console.log(edu)
  console.log("income")
  console.log(income)
  console.log("crime")
  console.log(crime)
  console.log("reg_crime")
  console.log(reg_crime)
  console.log("reg_income")
  console.log(reg_income)

  ghettos = ghetto
  munis = collectPops(pop)
  collectEmp(munis, emp)
  collectForeigners(munis, foreigners)
  collectEducation(munis, edu)
  collectCrime(munis, crime)
  regions = {}
  console.log(munis)
  plot2(ghettos, munis)
}

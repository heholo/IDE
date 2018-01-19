d3.select(window).on("load", init);

// global variables

var ghettos
var munis
var regions
var criterion = {}

var extents = {}

var friendlyNames = {
  unemployed: "Unemployed & Not Studying 18-64 (% 2 year avg)",
  immigrants: "Non Western Immigrants 18+ (%)",
  prosecuted: "Convicted Criminals 18+ (% 2 year avg)",
  education: "Only Completed Primary Education 30-59 (%)",
  income: "Gross Income as Percentage of Mean Regional Income"
}

for (var i = 2010; i < 2018; i++) {
    if (i < 2014) {
        criterion[i] = {
            unemployed: 40,
            immigrants: 50,
            prosecuted: 2.7,
        }
    } else {
        criterion[i] = {
            unemployed: 40,
            immigrants: 50,
            prosecuted: 2.7,
            education: 50,
            income: 55,
        }
    }
}

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
    .defer(d3.csv,  "data/muni_edu_cur.csv")
    .defer(d3.csv,  "data/muni_income.csv")
    .defer(d3.csv,  "data/muni_crime.csv")
    .defer(d3.csv,  "data/muni_region.csv")
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
function collectEmp(munis, emp, edu_cur) {

  var years = Object.keys(munis)
  // Make an empty object for each muni
  years.forEach(function (y) {
    munis[y].forEach(function (m) {
      m.employment = {
        _total_pop: 0,
        _total_emp: 0,
        _total_edu: 0,
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

  edu_cur.forEach(function (e) {
    empYears.forEach(function (y) {
      var muni = munis[y].get(e.municipality)

      // Insert raw data
      muni.employment._total_edu += e[y] - 0
    })
  })

  // Now iterate over munis and divide raw data
  // And also take average over last two years (if there)
  var y
  for (var i = 0; i < years.length; i++) {
    y = years[i]

    munis[y].forEach(function (m) {
      if (m.employment._total_pop) {
        m.employment.freq = (m.employment._total_emp + m.employment._total_edu)  / m.employment._total_pop
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

function collectRegions(munis, reg) {
  var years = Object.keys(munis)

  reg.forEach(function (reg) {
    years.forEach(function(y) {
      munis[y].get(reg.municipality).region = reg.region
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

function collectIncome(munis, reg, inc) {
  var years = Object.keys(munis)
  // Make an incty object for each muni
  years.forEach(function (y) {
    munis[y].forEach(function (m) {
      m._income = {
        _total_pop: 0,
        _total_inc: 0,
        _tmp: {},
        mean: undefined,
      }
    })
  })
  var incYears = years.slice(0, -1)  // we don't have data for 2017

  // Now load the raw data by multiplying the frequencies with the population of the age range
  inc.forEach(function (e) {
    incYears.forEach(function (y) {
      var muni = munis[y].get(e.municipality)
      const incKey = e["age-start"] + e["age-end"]
      if (e["value-type"] == "population_size") {
        muni._income._total_pop += e[y] - 0
      } else {
        muni._income._total_inc += e[y] - 0
      }
    })
  })

  // Now iterate over munis and divide raw data
  var y
  for (var i = 0; i < years.length; i++) {
    y = years[i]

    munis[y].forEach(function (m) {
      if (m._income._total_pop) {
        m._income.mean = m._income._total_inc / m._income._total_pop
      }

      if (i > 0) {
        var lastYearMuni = munis[y - 1].get(m.id)
        m.income = 100 * (lastYearMuni._income.mean / regions[y-1][lastYearMuni.region].income)
      }
    })
  }

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


function collectExtents(extents, munis, ghettos) {
  var years = Object.keys(criterion)

  years.forEach(function (y) {
    var cats = Object.keys(criterion[y])
    cats.forEach(function (c) {
      if (!extents[c]) extents[c] = { min: Infinity, max: -Infinity}

      extents[c].min = d3.min([extents[c].min,
                                  d3.min(munis[y], (d) => d[c]),
                                  d3.min(ghettos[y] || munis[y], (d) => d[c])
      ])

      extents[c].max = d3.max([extents[c].max,
                                  d3.max(munis[y], (d) => d[c]),
                                  d3.max(ghettos[y] || munis[y], (d) => d[c])
      ])

    })

  })
}

// plot2 constants
const plot2Margin = {
  top: 40,
  bottom: 40,
  left: 225,
  right: 100,
  padding: 10,
}
const plot2Dim = {
  w: 500,
  h: 550,
}
const plot2SubDim = {
  w: plot2Dim.w / 5,
  h: plot2Dim.h,
}

// run at page-load, initialize plot2
function generatePlot2() {
  // setting dimensions for total plot area
  d3.select("#plot2")
    .attr('width', plot2Dim.w + plot2Margin.left + plot2Margin.right)
    .attr('height', plot2Dim.h + plot2Margin.top + plot2Margin.bottom)

  // initialize each subplot for 2017
  Object.keys(criterion[2017]).forEach(function (key, i) {
    // creating svg and setting dimensions
    var svg = d3.select("#plot2")
      .append("g")
      .attr("class", key)
      .attr('width', plot2SubDim.w)
      .attr('height', plot2SubDim.h)
      .attr('transform', `translate(${plot2Margin.left + (plot2SubDim.w + plot2Margin.padding) * i}, ${plot2Margin.top})`)

    // adding elements of the subplot
    svg.append("g")
      .attr("class", "background")
    svg.append("g")
      .attr("class", "bars")
    svg.append("g")
      .attr("class", "x-axis")
    svg.append("g")
      .attr("class", "y-axis")
    svg.append("g")
      .attr("class", "limit")
    svg.append("g")
      .attr("class", "name")
  })

  // updating
  updateAllSubPlot2(2017)
}

// for dynamically updating
function updateAllSubPlot2(year) {

  // data building (only necessary once per year)
  const yay = 0
  if (yay === 0) {
    // filter ghetto = true
    function ghettoFilter(obj) {
      return obj.ghetto
    }
    var g = ghettos[year].filter(ghettoFilter)
    // test, outgoing ghettos
    var g = ghettos[year]

    // list of unique municipalities of the ghettos
    var muniList = [...new Set(g.map(item => item.municipality))]
    //console.log(g)
    //console.log(muniList)

    // filter munis
    function muniFilter(obj) {
      if (muniList.indexOf(obj.municipality) >= 0) {
        return true
      } else {
        return false
      }
    }
    var m = munis[year].filter(muniFilter)
    //console.log(m)

    // number of ghettos in each municipality
    muniGhettoN = []
    g.forEach(function(item) {
      t = muniList.indexOf(item.municipality)
      if (isNaN(muniGhettoN[t])) {
        muniGhettoN[t] = 1
      } else {muniGhettoN[t] ++}
    })
    //console.log(muniGhettoN)

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
    m.reverse()

    // initialize data array
    data = []
    // fill
    m.forEach(function(i) {

      g.forEach(function(t) {
        if (t.municipality === i.municipality) {
          data.push(t)
        }
      })
      data.push(i)
    })
  }

  var allCats = Object.keys(criterion[2017])
  var yearCats = Object.keys(criterion[year])
  var featureCount = yearCats.length

  allCats.forEach(function(key, i) {
    updateSubPlot2(key, i, year, data, featureCount)
  })
}

// MAIN FUNCTION
function updateSubPlot2(key, i, year, data, featureCount) {
  // defining scales, same for all years
  var xSpan = extents[key].max - extents[key].min
  var xScale = d3.scaleLinear()
    .domain([0, extents[key].max + 0.1*xSpan])
    .range([0, plot2SubDim.w ])
    .nice()
  var yScale = d3.scaleBand()
    .domain(data.map(function(d) { return d.id }))
    .range([plot2SubDim.h, 0])
    .padding(0.1)
  var bScale = yScale.copy() // scale for background
    .padding(0)
    .align(0.5)

  // selecting subplot
  svg = d3.select(`#plot2 .${key}`)

  // removing background
  svg.select(".background")
    .selectAll("*")
    .remove()
  // selecting background and binding data
  background = svg.select(".background")
    .selectAll("rect")
    .data(data, function(d) {return d.id})
  // adding background
  if (i === 0) {
    count = 0
    oldMuni = "initVal"
    background.enter()
      .append("rect")
      .attr("x", - plot2Margin.left)
      .attr("width", plot2SubDim.w* (featureCount * 1.08) + plot2Margin.left)
      .attr("y", function(d) { return bScale(d.id); })
      .attr("height", bScale.bandwidth)
      .style("fill", "white")
      .transition()
      .duration(1000)
      .style("fill", function(d) {
        if (d.municipality !== oldMuni) {count ++; oldMuni = d.municipality}
        if (count % 2 === 0) {return "lightgray"}
        else return "white"
      })
//      .style("fill-opacity", function() { if (count % 2 === 0) {return "1"}
//      else return "0"}) // invisible
  }

  // remove feature if not part of yearly criteria
  if (i >= featureCount) {
    svg.select(".bars")
      .selectAll("*")
      .remove()
    svg.select(".x-axis")
      .selectAll("*")
      .remove()
    svg.select(".y-axis")
      .selectAll("*")
      .remove()
    svg.select(".limit")
      .selectAll("*")
      .remove()
    svg.select(".name")
      .selectAll("*")
      .remove()
  } else { // update subplot!

    // selecting bars and binding data
    bars = svg.select(".bars")
      .selectAll("rect")
      .data(data, function(d) {return d.id})
    // updating bars
    bars.on("mouseover", function (d) {
      showTooltip(d3.event.pageX + 11, d3.event.pageY, `${d.id}<br>${d[key].toFixed(2)}%`)
        })
      .on("mouseout", function () {hideTooltip()
        })
      .transition()
      .duration(1000)
      .style("fill", function(d) { if (d.municipality === d.id) { // is municipality
        return "steelblue"} else { // if hell: begin
        if (key === "income") {
          if (d[key] >= criterion[year][key]) { // special case income
            return "#ffa696"} else {
            return "orangered"}
        } else if (d[key] <= criterion[year][key]) {
          return "#ffa696"} else {
          return "orangered"}
      }})
      .attr("width", function(d) { return xScale(d[key]); })
      .attr("y", function(d) { return yScale(d.id); })
      .attr("height", yScale.bandwidth)
    // adding bars
    bars.enter()
      .append("rect")
      .style("fill", function(d) { if (d.municipality === d.id) { // is municipality
        return "steelblue"} else { // if hell: begin
        if (key === "income") {
          if (d[key] >= criterion[year][key]) { // special case income
            return "#ffa696"} else {
            return "orangered"}
        } else if (d[key] <= criterion[year][key]) {
          return "#ffa696"} else {
          return "orangered"}
      }})
      .attr("width", function(d) { return xScale(d[key]); })
      .attr("y", function(d) { return yScale(d.id); })
      .attr("height", yScale.bandwidth)
      .on("mouseover", function (d) {
        showTooltip(d3.event.pageX + 11, d3.event.pageY, `${d[key].toFixed(2)}%`) // `${d.id}<br>${key}<br>${d[key].toFixed(2)}%`)
      })
      .on("mouseout", function () {
        hideTooltip()
      })
      .style("opacity", 0)
      .transition()
      .duration(1000)
      .style("opacity", 1)
    // removing bars
    bars.exit()
      .transition()
      .duration(1000)
      .style("opacity", 0)
      .remove()

    // removing limit
    svg.select(".limit")
      .selectAll("*")
      .remove()
    // adding limit
    svg.select(".limit")
      .append("line")
      .attr("x1",xScale(criterion[year][key]))
      .attr("y1",0)
      .attr("x2",xScale(criterion[year][key]))
      .attr("y2",plot2SubDim.h)
      .attr("stroke-width", 1)
//      .attr("stroke", "black")
//      .attr("stroke-dasharray", "2,10")
//      .text(criterion[year][key])
    svg.select(".limit")
      .append("text")
      .text(criterion[year][key]+ "%")
      .attr("transform","rotate(-20 " + xScale(criterion[year][key]) + " 0)" )
      .attr("text-anchor", "start")
      .attr("x",xScale(criterion[year][key]))
      .attr("y",-5)
      .style("font-size", 12)
      .style("font-family", "sans-serif")

    // defining x-axis (for values)
    var xAxis = d3.axisBottom()
      .scale(xScale)
      .ticks(2)
    // selecting and calling x-axis
    svg.select(".x-axis")
      .attr("transform", "translate(0," + plot2SubDim.h + ")")
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "+.4em")
      .attr("dy", "+.55em")

    // defining y-axis (for id's)
    var yAxis = d3.axisLeft()
      .scale(yScale)
    if (i === 0) { // only apply on the leftmost subplot
      temp = svg.select(".y-axis")
      temp.call(yAxis)
        .selectAll("text")
//        .data(data, function(d) {return d.id})
        .data(data)
        .style("font-weight", function(d) {if (d.id === d.municipality) {return "bold"} else {return "normal"}})
        .style("text-decoration", function(d) {if (d.id === d.municipality) {return "underline"} else {return "none"}})
        .style("font-style", function(d) {if (d.id !== d.municipality && d.ghetto !== true) {return "italic"} else {return "normal"}})
        .attr("fill", function(d) {if (d.id !== d.municipality && d.ghetto !== true) {return "orangered"} else {return "black"}})
      temp.transition()
        .duration(1000)
        .call(yAxis)
    }   else {
      svg.select(".y-axis")
        .append("line")
        .attr("x1",0)
        .attr("y1",0)
        .attr("x2",0)
        .attr("y2",plot2SubDim.h)
        .attr("stroke-width", 1)
        .attr("stroke", "black")
    }

    // removing name of feature
    svg.select(".name")
      .selectAll("*")
      .remove()
    // adding name of feature
    svg.select(".name")
      .append("text")
      .text(key.charAt(0).toUpperCase() + key.slice(1))
      .attr('transform', `translate(${3}, ${plot2SubDim.h + 3 * plot2Margin.padding})`)
      .style("font-size", 12)
      .style("font-family", "sans-serif")
  }
}

var everGhettoOn = false

function _init(err, ghetto, pop, emp, foreigners, edu, edu_cur, income, crime, muni_region, reg_crime, reg_income) {
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
  collectRegions(munis, muni_region)
  collectEmp(munis, emp, edu_cur)
  collectForeigners(munis, foreigners)
  collectEducation(munis, edu)
  collectCrime(munis, crime)

  // Set the region data
  regions = {}

  Object.keys(munis).forEach(function (y) {
    regions[y] = {}
  })
  reg_income.forEach(function (i) {
    Object.keys(munis).forEach(function (y) {
      if (!regions[y][i.region]) regions[y][i.region] = {}
      regions[y][i.region].income = i[y]
    })
  })

  collectIncome(munis, regions, income)
  collectExtents(extents, munis, ghettos)
  //console.log(munis)

  var dropdownMenu = d3.select("#sticky-selector")
                       .append("select")
  Object.keys(ghettos).forEach(function (y) {
    ghettos[y].forEach(function (g) {
      var muni = munis[y].get(g.municipality)
      if (!g.ghetto) return
      if (!muni.ghettos) {
        muni.ghettos = []
      }
      muni.ghettos.push[g.id]

    })
    dropdownMenu.append("option")
              .attr("option", y)
              .text(y)

  })

  
  $("#sticky-selector").sticky({topSpacing: 0});

  d3.select("#sticky-selector")
    .append("button")
    .text("play")
    .on("click", playAll)

  generateWeirdHistograms()
  generatePlot2()

  d3.select("body")
    .append("div")
    .attr("id", "tooltip")
    .style("opacity", 0);

  //console.log(dropdownMenu)
  dropdownMenu.property("value", 2017)
  dropdownMenu.on("change", function () {
    yearChange(d3.select(this).property("value"))
  });

  d3.select("a.crime")
    .on("mouseover", function () {
      d3.selectAll("#histograms div.histogram svg")
        .classed("faded", true)
      d3.select("#histograms div.prosecuted svg")
        .classed("faded", false)
      d3.select("#histograms div.immigrants svg")
        .classed("faded", false)
      showTooltip(d3.event.pageX + 10, d3.event.pageY, "Click To Toggle Years")
      
    })
    .on("mousemove", function () {
      showTooltip(d3.event.pageX + 10, d3.event.pageY, "Click To Toggle Years")
    })
    .on("mouseout", function () {
      d3.selectAll("#histograms div.histogram svg")
        .classed("faded", false)
      hideTooltip()
    })
    .on("click", function () {
      var dthis = d3.select(this)
      if (dthis.text() == "Show 2010") {
        yearChange(2010)
        dthis.text("Show 2017")
      } else {
        yearChange(2017)
        dthis.text("Show 2010")
      }
    })

  var unlucky = ["Tingbjerg/Utterslevhuse", "Bispeparken", "Tåstrupgård", "Degnegården mv"]
  d3.select("a.income")
    .on("mouseover", function () {
      yearChange(2014)
      d3.selectAll("#histograms div.histogram svg")
        .classed("faded", true)
      d3.select("#histograms div.unemployed svg")
        .classed("faded", false)
      d3.select("#histograms div.income svg")
        .classed("faded", false)

      d3.select("#histograms")
        .selectAll(".histogram .point")
        .filter(function (d) {
          return unlucky.indexOf(d.id) >= 0
        })
        .classed("highlighted", true)

      
    })
    .on("mouseout", function () {
      d3.selectAll("#histograms div.histogram svg")
        .classed("faded", false)
      d3.select("#histograms")
        .selectAll(".histogram .point")
        .classed("filter", function (d) {
          return unlucky.indexOf(d.id) >= 0
        })
        .classed("highlighted", false)


    })
    .on("click", function () {
      yearChange(2014)
    })

  var everGhetto = Object.values(ghettos).reduce(function (acc, e, i) {
    var accc = acc
    if (i == 1) accc = e.filter(d => d.ghetto).map(d => d.id)
    return e.filter(d => d.ghetto && accc.indexOf(d.id) >= 0).map(d => d.id)
  })
  d3.select("span.ever-ghetto").text(everGhetto.length);

  d3.select("a.unlucky")
    .on("mouseover", function () {
      d3.select("#histograms")
        .selectAll(".histogram .point")
        .filter(function (d) {
          return everGhetto.indexOf(d.id) >= 0
        })
        .classed("highlighted", true)                       
    })
    .on("mouseout", function () {
      d3.select("#histograms")
        .selectAll(".histogram .point")
        .filter(function (d) {
          return everGhetto.indexOf(d.id) >= 0
        })
        .classed("highlighted", false)                       
    })
    .on("click", function () {
      d3.select("#histograms")
        .selectAll(".histogram .point")
        .filter(function (d) {
          return everGhetto.indexOf(d.id) >= 0
        })
        .classed("sticky-highlighted", !everGhettoOn)
      everGhettoOn = !everGhettoOn
    })

}

function playAll() {
  play(d3.min(Object.keys(ghettos).map((x) => x - 0)))
}

function play(year) {
  if (year > 2017) return;
  yearChange(year)
  d3.timeout(() => play(year + 1), 1200)

}

function yearChange(year) {
  d3.select("#sticky-selector select").property("value", year)
  updateAllWeirdHistograms(year);
  updateAllSubPlot2(year);
}

function showTooltip(x, y, content) {
  d3.select("#tooltip")
    .style("left", `${x}px`)
    .style("top", `${y}px`)
    .html(content)
    .transition()
    .style("opacity", 1)
}

function hideTooltip() {
  d3.select("#tooltip")
    .transition()
    .style("opacity", 0)
}


var histogramData = {
  width: 600,
  height: 1000,
  padding: 20,
}

function generateWeirdHistograms() {
  var dims = {
    width: histogramData.width,
    height: histogramData.height,
  }

  var padding = histogramData.padding

  var histoMensions = {
    width: dims.width,
    height: dims.height / 5,
  }

  var outer = d3.select("#histograms")
  outer.select("div.legend div.text").style("width", dims.width + "px")
  var legend = outer.select("div.legend")
                    .insert("svg", ":first-child")
                    .style("width", 2*padding + dims.width + "px")
                    .style("height", 2*padding + "px")
  generateHistogramLegend(legend, histoMensions.height / 3, dims.width, padding)

  Object.keys(criterion[2017]).forEach(function (key, i) {
    var svg = d3.select("#histograms")
                .append("div")
                .attr("class", `${key} histogram`)
                .append("svg")
                .style("width", 2*padding + dims.width + "px")
                .style("height", 2*padding + histoMensions.height + "px")

    generateWeirdHistogram(svg, key, 2017, histoMensions, padding)
  })

}

function generateHistogramLegend(svg, height, width, padding) {
  var container = svg.append("g")
                     .attr("transform", `translate(${padding})`);
  var ordinary = container.append("g")
  var rad = 4
  var boxHeight = height / 2
  var boxPadding = 20
  var boxWidth = (width - 2 * boxPadding) / 3
  ordinary.append("circle")
          .attr("r", rad)
          .attr("cx", 0)
          .attr("cy", boxHeight / 2)
          .classed("point", true)
  ordinary.append("text")
          .attr("textanchor", "start")
          .attr("x", 10)
          .attr("y", boxHeight / 2 + rad)
  //          .attr("textLength", boxWidth - boxPadding)
          .text("Municipality")
  var ordinaryLength = ordinary.select("text").node().getComputedTextLength() + 10 + boxPadding
  
  var withGhetto = container.append("g")
                            .attr("transform", `translate(${ordinaryLength})`);
  withGhetto.append("circle")
            .attr("r", rad)
            .attr("cx", 0)
            .attr("cy", boxHeight / 2)
            .attr("class", "point hasGhetto")
  withGhetto.append("text")
            .attr("textanchor", "start")
            .attr("x", 10)
            .attr("y", boxHeight / 2 + rad)
            .text("Municipality Containing a Ghetto")

  var withGhettoLength = withGhetto.select("text").node().getComputedTextLength() + 10 + boxPadding

  var ghetto = container.append("g")
                        .attr("transform", `translate(${ordinaryLength + withGhettoLength})`);
  ghetto.append("circle")
            .attr("r", rad)
            .attr("cx", 0)
            .attr("cy", boxHeight / 2)
            .attr("class", "point ghetto")
  ghetto.append("text")
            .attr("textanchor", "start")
            .attr("x", 10)
            .attr("y", boxHeight / 2 + rad)
            .text("Ghetto")

}


/* Overview chart thingies
 * :id whatever needed to d3.select the container
 * :key is the key on the objects
 */
function generateWeirdHistogram(svg, key, year, dims, padding) {
  var lim = svg.append("g")
               .attr("class", "limit")
               .attr("transform", `translate(${padding})`);

  var container = svg.append("g")
                       .attr("transform", `translate(${padding} ${padding + dims.height/2})`);

    container.append("g")
             .attr("class", "x-axis");

    container.append("g")
             .attr("class", "points");

    svg.append("g")
       .attr("class", "title")
       .attr("transform", `translate(${padding} ${padding})`)
     .append("text")
     .attr("font-size", "12");

  lim.append("line")
     .attr("y1", padding)
     .attr("y2", dims.height - padding)
     .attr("x1", 0)
     .attr("x2", 0);
  lim.append("text")
     .attr("y", padding * 2)
     .attr("x", 0);
  updateWeirdHistogram(svg, key, year, dims, padding)
}

function updateAllWeirdHistograms(year) {
  var dims = {
    width: histogramData.width,
    height: histogramData.height,
  }

  var padding = histogramData.padding

  var histoMensions = {
    width: dims.width,
    height: dims.height / 5,
  }

  var allCats = Object.keys(criterion[2017])
  var yearCats = Object.keys(criterion[year])

  allCats.forEach(function(cat) {
    var svg = d3.select(`#histograms div.${cat} svg`)

    if (yearCats.indexOf(cat) >= 0) {
        svg.classed("hidden", false)
      updateWeirdHistogram(svg, cat, year, histoMensions, padding)

    } else {
        svg.classed("hidden", true)

    }
  })

}

function updateWeirdHistogram(container, key, year, dims, padding) {
  container.select(".title text").text(friendlyNames[key])
  var data = munis[year].concat(ghettos[year].filter((d) => !!d.ghetto))
  var _key = (d) => d[key]

  // var ext = d3.extent(data, _key)
  var ext = [extents[key].min, extents[key].max]
  // Limit line
  var prettyExt = [Math.max(0, ext[0] - 0.15 * (ext[1] - ext[0])),
                   Math.min(ext[1]>100 ? Infinity : 100, ext[1] + 0.15 * (ext[1] - ext[0]))]

  var x = d3.scaleLinear()
            .domain(prettyExt)
            .range([0, dims.width])

  var ticks = 70
  //var actualTicks = d3.ticks(ext[0], ext[1], ticks - 1)
  var actualTicks = d3.range(ext[0], ext[1], (ext[1] - ext[0]) / ticks)
  var tickWidth = (dims.width) / actualTicks.length
  var dotSize = (tickWidth / 2) * 0.5

  var hist = d3.histogram()
               .value(_key)
               .domain(x.domain())
               .thresholds(actualTicks)


  var bins = hist(data)

  var pointsData = bins.reduce(function (acc, cur, i) {

    var annotated = cur.map(function (d, i) {
      return { x0: cur.x0,
               x1: cur.x1,
               binIndex: i,
               binLength: cur.length,
               ...d
      }
    })
    return acc.concat(annotated)
  })

  var axis = d3.axisBottom(x)
               .ticks(2)
               .tickValues(x.domain())

  container.selectAll("g.x-axis")
               .call(axis)

  var points = container
    .select('.points')
    .selectAll('.point')
    .data(pointsData, (d) => d.id)

  var _ypos = function(d, i) {
    var mag = ((d.binIndex + 1) / 2) * 6 + 2
    return (d.binIndex + 1) % 2 ? 0.5-mag : mag
  }

  points.attr("r", dotSize)
        .classed("ghetto", (d) => !!d.ghetto)
        .classed("hasGhetto", (d) => !d.ghetto && d.ghettos)
        .transition()
        .duration(1000)
        .attr("cx", (d) => x((d.x1 + d.x0) / 2))
        .attr("cy", _ypos)

  var _getFromMuni = (d) => d3.select("#histograms")
                              .selectAll(".point")
                              .filter((d2) => !!d2 && d.municipality == d2.municipality);

  points.enter()
        .append("circle")
        .attr("r", dotSize)
        .attr("cx", (d) => x((d.x1 + d.x0)/ 2))
        .attr("cy", _ypos)
        .attr("class", "point")
        .classed("ghetto", (d) => !!d.ghetto)
        .classed("hasGhetto", (d) => !d.ghetto && d.ghettos)
        .on("mouseover", function (d) {
          showTooltip(d3.event.pageX + 11, d3.event.pageY, `${d.id}<br>${d[key].toFixed(2)}%`);
          _getFromMuni(d).classed("highlighted", true);
          
        })
        .on("mouseout", function (d) {
          hideTooltip()
          _getFromMuni(d).classed("highlighted", false)

        })
        .on("click", function(d) {
          var selector = d3.event.shiftKey ? _getFromMuni(d) : d3.select("#histograms")
                                                                 .selectAll(".point")
                                                                 .filter((dd) => dd && dd.id == d.id)
          selector.classed("sticky-highlighted", !d3.select(this).classed("sticky-highlighted"))
        })
        .style("opacity", 0)
        .transition()
        .duration(800)
        .style("opacity", 1)

    points.exit()
        .transition()
        .duration(1000)
        .style("opacity", 0)
        .remove()

  var lim = container.select(".limit");
  lim.select("line")
     .transition()
     .duration(800)
     .attr("x1", x(criterion[year][key]))
     .attr("x2", x(criterion[year][key]));
  lim.select("text")
     .transition()
     .duration(1000)
     .attr("x", x(criterion[year][key]) + 10)
     .text(`${criterion[year][key]}%`)

}

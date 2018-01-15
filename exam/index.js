d3.select(window).on("load", init);

// global variables

var ghettos
var munis
var regions
var criterion = {}

var friendlyNames = {
  unemployed: "Unemployed 18-64 (% 2 year avg)",
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

  generateWeirdHistograms()
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

  Object.keys(criterion[2017]).forEach(function (key, i) {
    var svg = d3.select("#histograms")
                .append("div")
                .attr("class", key)
                .append("svg")
                .style("width", 2*padding + dims.width + "px")
                .style("height", 2*padding + histoMensions.height + "px")

    generateWeirdHistogram(svg, key, 2017, histoMensions, padding)
    console.log(key)
  })

}



/* Overview chart thingies
 * :id whatever needed to d3.select the container
 * :key is the key on the objects
 */
function generateWeirdHistogram(svg, key, year, dims, padding) {
  var container = svg.append("g")
                     .attr("transform", `translate(${padding} ${padding + dims.height/2})`)

  container.append("g")
                     .attr("class", "x-axis")

  container.append("g")
                     .attr("class", "points")

  svg.append("g")
                     .attr("class", "title")
                     .attr("transform", `translate(${padding} ${padding})`)
                     .append("text")
                     .attr("font-size", "12")

  var lim = svg.append("g")
               .attr("class", "limit")
  lim.append("line")
               .attr("y1", padding)
               .attr("y2", dims.height - padding)
               .attr("x1", 0)
               .attr("x2", 0)
  lim.append("text")
               .attr("y", padding * 2)
               .attr("x", 0)
  updateWeirdHistogram(svg, key, year, dims)
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
    var svg = d3.select(`#histograms .${cat}`)
    console.log(cat)
    if (yearCats.indexOf(cat) >= 0) {
      svg.transition()
         .style("stroke-opacity", 1)
         .style("fill-opacity", 1)
      updateWeirdHistogram(svg, cat, year, histoMensions, padding)

    } else {
      svg.transition()
         .style("stroke-opacity", 0.05)
         .style("fill-opacity", 0.05)

    } 
  })
  
}

function updateWeirdHistogram(container, key, year, dims, padding) {
  container.select(".title text").text(friendlyNames[key])
  var data = munis[year].concat(ghettos[year].filter((d) => !!d.ghetto))
  var _key = (d) => d[key]
  console.log(data)
  var ticks = 100
  var tickWidth = (dims.width) / ticks
  var dotSize = tickWidth / 2 - 1
  var ext = d3.extent(data, _key)

  // Limit line
  var prettyExt = [Math.max(0, ext[0] - 0.25 * (ext[1] - ext[0])),
                   Math.min(100, ext[1] + 0.25 * (ext[1] - ext[0]))]

  var x = d3.scaleLinear()
            .domain(prettyExt)
            .range([0, dims.width])

  var hist = d3.histogram()
               .domain(x.domain())
               .thresholds(x.ticks(ticks))
               .value(_key)

  var bins = hist(data)

  var pointsData = bins.reduce(function (acc, cur, i) {
    var annotated = cur.map(function (d, i) {
      return { x0: cur.x0,
               x1: cur.x1,
               binIndex: i,
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
    .data(pointsData)

  console.log(points)

  var _ypos = function(d, i) {
    var mag = ((d.binIndex + 1) / 2) * 7 + 2
    return (d.binIndex + 1) % 2 ? -mag : mag
  }

  points.attr("r", dotSize)
        .transition()
        .duration(1000)
        .attr("cx", (d) => x(d.x0))
        .attr("cy", _ypos)

  points.enter()
        .append("circle")
        .attr("r", dotSize)
        .attr("cx", (d) => x(d.x0))
        .attr("cy", _ypos)
        .attr("class", "point")
        .classed("ghetto", (d) => !!d.ghetto)
        .style("opacity", 0)
        .transition()
        .style("opacity", 1)

  points.exit()
        .transition()
        .style("opacity", 0)
        .remove()

  var lim = container.select(".limit")
  lim.select("line")
                     .transition()
                     .duration(1000)
                     .attr("x1", x(criterion[year][key]))
                     .attr("x2", x(criterion[year][key]))
  lim.select("text")
                     .transition()
                     .duration(1000)
                     .attr("x", x(criterion[year][key]) + 10)
  .text(`${criterion[year][key]}%`)

}

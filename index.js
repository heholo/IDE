d3.select(window).on('load', init);

var cats;

function addRandomCatGif() {
    var newDiv = d3.select('#script1')
                   .append('div')
    newDiv.html('<a href="http://thecatapi.com"><img src="http://thecatapi.com/api/images/get?format=src&type=gif&timestamp=' + Date.now() + '"></a>')
    newDiv.append('p').html('Inserted by javascript (see <a href="www.thecatapi.com">www.thecatapi.com</a>)')
}

function stopCats() {
    clearInterval(cats)
    document.getElementById('startcats').style.display = 'block'
    document.getElementById('stopcats').style.display = 'none'
}

function startCats() {
    cats = setInterval(addRandomCatGif, 5000)
    document.getElementById('stopcats').style.display = 'block'
    document.getElementById('startcats').style.display = 'none'
    addRandomCatGif()
}

function init() {
    var newDiv = d3.select('#script1')
                   .append('div')
    newDiv.html("<img src=\"http://your-photography.com/files/2016/07/HH0A1943.jpg\">")
    newDiv.append('p').text('Inserted by javascript')
    cats = setInterval(addRandomCatGif, 5000)
}

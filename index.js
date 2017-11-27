d3.select(window).on('load', init);

function addRandomCatGif() {
    var newDiv = d3.select('#script1')
                   .append('div')
    newDiv.html('<a href="http://thecatapi.com"><img src="http://thecatapi.com/api/images/get?format=src&type=gif&timestamp=' + Date.now() + '"></a>')
    newDiv.append('p').html('Inserted by javascript (see <a href="www.thecatapi.com">www.thecatapi.com</a>)')
}

function init() {
    var newDiv = d3.select('#script1')
                   .append('div')
    newDiv.html("<img src=\"http://your-photography.com/files/2016/07/HH0A1943.jpg\">")
    newDiv.append('p').text('Inserted by javascript')
    setInterval(addRandomCatGif, 5000)
}

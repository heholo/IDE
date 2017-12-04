
d3.select(window).on('load', init);

function init() {
    d3.text('kobenhavn', handleData);
}

function handleData(d) {
    const parser = d3.dsvFormat(' ');
    const parsed = parser.parse(d.replace(/[ ]+/g, ' '));
    console.log(parsed);
}

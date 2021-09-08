const side = 400;
const num_slices = 3;
const slice = side / num_slices;
const circle_size = 100;

function setup() {
    createCanvas(side, side);
    noLoop();
}

function draw() {
    colorMode(HSB);
    background(random(255), random(255), random(255));
    strokeWeight(0);
    for (var i = 0; i < num_slices + 1; i++) {
        for (var j = 0; j < num_slices + 1; j++) {
            fill(random(255), random(255), random(255));
            stroke(0);
            circle(i * slice, j * slice, circle_size);
        }
    }
}

//neural network library
const brain = require('brain.js');      
//plotting library
const plotlib = require('nodeplotlib');     

//take user input from command line
const prompt = require('prompt-sync')({sigint: true});

//write output to file
const fs = require('fs');

//set up electron imports
const electron = require('electron');
const {app, BrowserWindow, Menu, ipcMain} = electron;
const path = require('path');
const url = require('url');

//dataset of songs with the following attributes:
//track,artist,uri,danceability,energy,key,loudness,mode,speechiness,acousticness,
//instrumentalness,liveness,valence,tempo,duration_ms,time_signature,chorus_hit,sections,target
var data = require('./dataset-of-10s.json');

//end of pre requisites

//global variables

const config = {
    activation : 'sigmoid'
};
var train_data = [];
var test_data = [];
var test_attr = [];
const prob = [];
const hit_flop = [];
var isTestDataLoaded = false;
const network = new brain.NeuralNetwork(config);
//to pass training error from function to another
const nw_err = [];



function loadTrainingData (){

    //to create an array of objects later to be pushed into training data
    for (var i = 0; i < 6397; i++) {
        var append_obj = {input : [
            data[i].danceability, data[i].energy, data[i].liveness, data[i].loudness, data[i].acousticness,
        data[i].instrumentalness, data[i].time_signature, data[i].sections, data[i].speechiness
        ],
        output : [
            data[i].target
        ]
        };
        train_data.push(append_obj);
    }
}//loadTrainingData()

function loadTestingData (startPoint, endPoint){

    //take input for start and ending points of test data
    // var startPoint = prompt(`enter a starting point for test data from [0-6397]: `);
    // startPoint = Number(startPoint);
    // var endPoint = prompt(`enter ending point for test data > ${startPoint} & <= 6397: `);
    // endPoint = Number(endPoint);


    console.log(`${startPoint} and ${endPoint}`);
    // create array of test data
    for (var i = startPoint; i < endPoint; i++) {
        var append_obj = {input : [
            data[i].danceability, data[i].energy, data[i].liveness, data[i].loudness, data[i].acousticness,
            data[i].instrumentalness, data[i].time_signature, data[i].sections, data[i].speechiness
        ]
        
        };
        var append_obj2 = {
            input : [
                data[i].track, data[i].artist
            ],
            output : [
                data[i].target
            ]
        }
        test_data.push(append_obj);
        test_attr.push(append_obj2);
        isTestDataLoaded = true;
    }
}//loadTestingData()


//Boxplot graph code
function boxplotTraining(){
    const box_var = [];
    for (var j = 0; j < train_data.length; j++) {
        box_var.push(train_data[j].input[5]);
    }


    const box_plot = {
        x: box_var, type : 'box'
    };

    const layout = {
        xaxis : {
            title : "BOXPLOT FOR INSTRUMENTALNESS VALUES OF TRAINING DATA"
        }
    }
    plotlib.plot([box_plot], layout);
}

//Scatter graph code
function scatterTraining(){
    const sc_var = [];
    for (var j = 0; j < train_data.length; j++) {
        sc_var.push(train_data[j].input[5]);
    }

    const scatter_gr = {
        x : sc_var, type : 'scatter', mode : "markers", marker: {
            color: "rgb(234, 153, 153)", size: 12, line : {
            color : "white", width : 0.5
        }
    }
    };


    const layout1 = {
        xaxis : {
            title : "SCATTER FOR INSTRUMENTALNESS VALUES OF TRAINING DATA"
        }
    };

    plotlib.plot([scatter_gr], layout1);
}//scatterTraining()

//train neural network
function trainData (){
    const train_results = network.train(train_data, {iterations : 1000 });
    console.log("data has been trained");
    nw_err.push(train_results);
}//trainData()

function testResults() {
    if (isTestDataLoaded == true) {
        var tp = 0, tn = 0, fp =0, fn = 0;
        //apply test data to the neural network and print results
        fs.writeFileSync('output.txt','');
        for (var i = 0; i < test_data.length; i++) {
            //output is of type Float32Array and to access the actual value we use index 0
            const output = network.run(test_data[i].input);
            fs.appendFileSync('output.txt', `The Probability of the song ${test_attr[i].input[0]} by ${test_attr[i].input[1]} being a hit is ${output} and the actual value is ${test_attr[i].output}\n`);
            prob.push(output[0]);
            hit_flop.push(test_attr[i].output[0]);
            //if value is closer to 0 than 1
            if (output[0] < 1 - output[0] ){
                //if the target value was 0
                if (test_attr[i].output[0] == 0) {
                    tn++;
                    // console.log(tn);
                }
                else {
                    fn++;
                }
            }
            //if value is closer to 1
            else {
                //if target value was 1
                if (test_attr[i].output[0] == 1) {
                    tp += 1;
                }
                else {
                    fp += 1;
                }
            }
        }
        console.log("total test data: "+test_data.length);
        fs.appendFileSync('output.txt',`\n\ntotal test data: ${test_data.length}\n`);
        // console.log(`${tp} and ${tn} and ${fp} and ${fn}`);
        const test_err = ((tp + tn ) / (tp + tn +fp +fn)) * 100;
        // console.log(nw_err);
        const train_error = 100 - nw_err[0].error;
        console.log(`the training accuracy rate is ${train_error}`);
        fs.appendFileSync('output.txt',`the training accuracy rate is ${train_error}\n`);

        console.log(`the testing accuracy rate is ${test_err} `);
        fs.appendFileSync('output.txt',`the testing accuracy rate is ${test_err} \n`);
    }
    else {
        console.log("Test data is not loaded.");
    }

}//testResults()

//test accuracy
function testResultsOutput(){
    //plotting the results in scatter plot
    //uncomment the below code to generate a scatter graph of result data
    const result_prob = {
        x: prob, y : hit_flop, type : 'scatter', mode : "markers", marker: {
            color: "rgb(234, 153, 153)", size: 12, line : {
            color : "white", width : 0.5
            }
        },
        
    };

    const res_layout = {
        xaxis : {
            title : "SCATTER FOR RESULT VALUES OF TEST DATA"
        }
    };

    plotlib.plot([result_prob], res_layout);
}

//Electron code. GUI PART
let mainWindow, addTestWindow;

app.on('ready', function() {
    mainWindow = new BrowserWindow({width : 800, height : 600, webPreferences : {
        nodeIntegration : true //true because needed to run on node.js
    }});
    mainWindow.loadURL(url.format({
        pathname : path.join(__dirname, 'index.html'),
        protocol : 'file',
        slashes : true
    }));
    //on close, close everything
    mainWindow.on('closed', function() {
        app.quit();
    });

    //build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);

    //actually insert menu in the app
    Menu.setApplicationMenu(mainMenu);
});

//funtion to create add test points window pop up
function createAddTestWindow() {
    addTestWindow = new BrowserWindow({width : 300, height : 400, title : 'Add Test Datapoints', webPreferences : {nodeIntegration : true}});

    addTestWindow.loadURL(url.format({
        pathname : path.join(__dirname, 'addTestWindow.html'),
        protocol : 'file',
        slashes : true
    }));

    //Garbage collection to save memory even when addWindow is closed
    addTestWindow.on('close', function() {
        addTestWindow = null;
    });

}

// //recieve start and end values from addWindow
// ipcMain.on('startValue', 'endValue', function(e, startValue, endValue){
//     loadTestingData(startValue, endValue);
//     addTestWindow.close();
// });

//recieve call from mainWindow
ipcMain.on('startBoxplot', function(e) {
    boxplotTraining();
});

//recieve call from mainWindow
ipcMain.on('startScatter', function(e) {
    scatterTraining();
});

//recieve call from mainWindow
ipcMain.on('startTest', function(e) {
    if(isTestDataLoaded == true) {
        console.log('data training has started.');
        loadTrainingData();
        trainData();
        mainWindow.webContents.send('dispMsg',{msg: 'Test has been completed. click Generate Result Button.double click to delete this msg'} );
    }
    else {
        mainWindow.webContents.send('dispMsg', {msg:'Training data has not been loaded. Load it using menu bar. double click to delete this msg'});
    }
    
    
});

ipcMain.on('dataPoints', function(e, data_v){
    loadTestingData(data_v.ss, data_v.ee);
    addTestWindow.close();
});

ipcMain.on('startPrintResults', function(e) {
    if(isTestDataLoaded == true) {
        testResults();
        testResultsOutput();
        mainWindow.webContents.send('dispMsg', {msg:'Result has been saved to output.txt a browser tab with scatter should also open. double click to delete this msg'});

    }
    else {
        mainWindow.webContents.send('dispMsg', {msg:'Training data has not been loaded. Load it using menu bar. double click to delete this msg'});
    }
});


//create menu templ
const mainMenuTemplate = [
    {
        label : 'File',
        submenu : [
            {
                label : 'Add Test Datapoints',
                accelerator : process.platform == 'darwin' ? 'Command+T' : 'Ctrl+T',
                click() {
                    createAddTestWindow();
                }
            },
            {
                label : 'Quit',
                accelerator : process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
                click() {
                    app.quit();
                }
            }
        ]
    },
    {
        label : 'Extra',
        submenu : [
            {
                role : 'reload',
            },
            {
                label : 'Developer Tools',
                accelerator : process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
                click (item, focusedWindow) {
                    focusedWindow.toggleDevTools();
                }
            }
        ]
    }
];

//method to mac menubar work in macOS
// if(process.platform == 'darwin') {
//     mainMenuTemplate.unshift({});
// }
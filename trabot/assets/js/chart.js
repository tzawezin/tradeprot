document.addEventListener("DOMContentLoaded",init);
let chart = LightweightCharts.createChart(document.querySelector("#chart"), {
    width: 800,
    height: 800,
    layout: {
        backgroundColor: '#000000',
        textColor: 'rgba(255, 255, 255, 0.9)',
    },
    grid: {
        vertLines: {
            color: 'rgba(197, 203, 206, 0)',
        },
        horzLines: {
            color: 'rgba(197, 203, 206, 0)',
        },
    },
    crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
    },
    rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
    },
    timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(197, 203, 206, 0.8)',
    }
});
let currentBar = {
    open: null,
    high: null,
    low: null,
    close: null,
    time: null,
};
let currentBar2 = {
    value: null,
    time: null,
};
let candleSeries = chart.addCandlestickSeries({
    upColor: 'rgba(0, 255, 0, 0.8)',
    downColor: 'rgba(255,0,0,0.8)',
    borderDownColor: 'rgba(255,0,0,0.8)',
    borderUpColor: 'rgba(0, 255, 0, 0.8)',
    wickDownColor: 'rgba(255,0,0, 0.8)',
    wickUpColor: 'rgba(0, 255, 0, 0.8)',
});
let data, dataConvL, dataBaseL,dataLSA,dataLSB,dataLSC,dataLSD;
data = [];
dataConvL = [];
dataBaseL = [];
dataLSA = [];
dataLSB = [];
dataLSC = [];
dataLSD = [];

let socketBUrl = "wss://stream.binance.com:9443/ws/";
let curr = "BTCBUSD";
let kl = "@kline_1m";
let mtik = "@miniTicker";
let apiBUrl = "https://api.binance.com";
let apiKl = "/api/v3/klines?symbol=";
let apiInter = "&interval=1m&limit=1000";

let ichumoku = true;

let conversionLinePeriods = 9;
let conversionLine = chart.addLineSeries({
    color: 'rgba(255,255,255, 0.8)',
    lineWidth: 4
});
let baseLinePeriods = 26;
let baseLine = chart.addLineSeries({
    color: 'rgba(176, 110, 39, 0.8)',
    lineWidth: 4
});


let cloudDisplacement = 60 * 52;

let leadingSpanALine = chart.addLineSeries({
    color: 'rgba(0, 255, 0, 0.8)',
    lineWidth: 1
});
let leadingSpanBPeriods = 52;
let leadingSpanBLine = chart.addLineSeries({
    color: 'rgba(255, 0, 0, 0.8)',
    lineWidth: 1
});
let leadingSpanAreaC = chart.addCandlestickSeries({
    upColor: 'rgba(0, 255, 0, 0.15)',
    downColor: 'rgba(255,0,0,0.15)',
    borderDownColor: 'rgba(255,0,0,0.15)',
    borderUpColor: 'rgba(0, 255, 0, 0.15)',
    wickDownColor: 'rgba(255,0,0, 0)',
    wickUpColor: 'rgba(0, 255, 0, 0)',
    crosshairMarkerVisible: false,
    crosshairMarkerRadius: 100,
});

let ourRequest = new XMLHttpRequest();
ourRequest.open('GET', apiBUrl + apiKl + curr + apiInter, true);

function init() {
    document.querySelector("#ichCl").checked = ichumoku;
    document.querySelector("#ichCl").addEventListener("click",function (e) {
        ichumoku = e.target.checked;
        if (ichumoku){
            dataConvL = [];
            dataBaseL = [];
            dataLSA = [];
            dataLSB = [];
            dataLSC = [];
            dataLSD = [];
            initIchumoku();
        }else {
            conversionLine.setData([]);
            baseLine.setData([]);
            leadingSpanALine.setData([]);
            leadingSpanBLine.setData([]);
            leadingSpanAreaC.setData([]);
        }
    });
    setTimeout(gokZone,1000)

}
function initIchumoku() {
    if (ichumoku) {
        getAvgHighLow(conversionLinePeriods,dataConvL,0);
        conversionLine.setData(dataConvL);
        getAvgHighLow(baseLinePeriods,dataBaseL,0);
        baseLine.setData(dataBaseL);
        getLSA();
        leadingSpanALine.setData(dataLSA);
        getAvgHighLow(leadingSpanBPeriods,dataLSB,cloudDisplacement);
        leadingSpanBLine.setData(dataLSB);
        getLSDC();
        leadingSpanAreaC.setData(dataLSC);
        //leadingSpanAreaD.setData(dataLSD);
    }
}
function getLSDC() {
    dataLSA.forEach((x,i)=>{
        let res = undefined;
        let res2 = undefined;
        if(x?x.value:false){
            if(dataLSB[i]?dataLSB[i].value:false){
                    res = x.value;
                    res2 = dataLSB[i].value

            }
        }
        dataLSC.push({time:x.time,open:res2,close:res,high:res,low:res2});
    })
}
function getLSA(){

    dataBaseL.forEach((x,i)=>{
        let ls = undefined;
        if(x.value){
         if (dataConvL[i].value){
             ls = (x.value + dataConvL[i].value)/2;
         }
        }
        dataLSA.push({time:x.time+cloudDisplacement,value:ls})
    })
}

function getAvgHighLow(LinePeriods,dataLine,offset) {
    let highconv = 0;
    let lowconv = 0;
    let conv;
    data.forEach((x, i) => {
        if (i >= LinePeriods) {
            highconv = 0;
            lowconv = x.close;
            conv = undefined;
            for (let ii = i - LinePeriods ; ii <= i; ii++) {
                let o = parseFloat(data[ii].high);
                if (o > highconv) {
                    highconv = o
                }
                let c = parseFloat(data[ii].low);
                if (c < lowconv) {
                    lowconv = c;
                }
            }
            conv = (parseFloat(lowconv) + parseFloat(highconv)) / 2
        }
        dataLine.push({time: data[i].time + offset, value: conv})
    });
}


ourRequest.onload = function () {
    // Will convert the string to something Javascript can understand
    let result = JSON.parse(ourRequest.responseText);
    // You can now use it as an array
    result.forEach(d => {
        data.push({time: (d[0] / 1000) + 3600, open: d[1], high: d[2], low: d[3], close: d[4]});

    });
    candleSeries.setData(data);
    initIchumoku();

};
ourRequest.send();

let websok = new WebSocket(socketBUrl + curr.toLowerCase() + kl);
let lasttime = null;

websok.onmessage = function (e) {
    let d = JSON.parse(e.data);
    let time = ( d.k.t / 1000) + 3600;
    if (time === lasttime) {
    } else {
        data.push({time: time, open: d.k.o, high: d.k.h, low: d.k.l, close: d.k.c});
        lasttime = time;
        pushIchumoku();
    }
    mergeTickToBar(d.k,time);
    updateIchumoku(time);
};
function updateIchumoku(time) {
    if (ichumoku) {
        updategetAvgHighLow(conversionLinePeriods,conversionLine,time);
        updategetAvgHighLow(baseLinePeriods,baseLine,time);
    }
}

function updategetAvgHighLow(LinePeriods,Line,time) {
    let i = data.length -1;
    let highconv = 0;
    let lowconv = data[i-1].low;
    let conv = undefined;
    for (let ii = i - LinePeriods ; ii <= i; ii++) {
        if (ii === i){
            let oo = parseFloat(currentBar.high);
            if (oo > highconv) {
                highconv = oo
            }
            let co = parseFloat(currentBar.low);
            if (co < lowconv) {
                lowconv = co;
            }
        }else {
            let o = parseFloat(data[ii].high);
            if (o > highconv) {
                highconv = o
            }
            let c = parseFloat(data[ii].low);
            if (c < lowconv) {
                lowconv = c;
            }
        }
    }
    conv = (parseFloat(lowconv) + parseFloat(highconv)) / 2;
    Line.update({time: time, value: conv});
}
function pushIchumoku() {
    if (ichumoku) {
        pushupdategetAvgHighLow(conversionLinePeriods,dataConvL);
        pushupdategetAvgHighLow(baseLinePeriods,dataBaseL);
    }
}
function pushupdategetAvgHighLow(LinePeriods,dataLine) {
    let i = data.length -1;
    let highconv = 0;
    let lowconv = data[i].close;
    let conv = undefined;
    for (let ii = i - LinePeriods + 1; ii <= i; ii++) {

        let o = parseFloat(data[ii].high);
        if (o > highconv) {
            highconv = o
        }
        let c = parseFloat(data[ii].low);
        if (c < lowconv) {
            lowconv = c;
        }
    }
    conv = (parseFloat(lowconv) + parseFloat(highconv)) / 2;
    dataLine.push({time: data[i].time, value: conv});
}
function mergeTickToBar(k,time) {
    currentBar = {
        open: k.o,
        high: k.h,
        low: k.l,
        close: k.c,
        time: time,
    };
    let price = k.c;
    if (currentBar.open === null) {
        currentBar.open = price;
        currentBar.high = price;
        currentBar.low = price;
        currentBar.close = price;
    } else {
        currentBar.close = price;
        currentBar.high = Math.max(currentBar.high, price);
        currentBar.low = Math.min(currentBar.low, price);
    }
    candleSeries.update(currentBar);
}

/////////////////////////////////////// hokzone /////////////////
let gokjes = [];
let inzetten = false;
let afhalen = false;
let gokje = false;
let currbet = {starttime:"",stoptime:"",startprice:"",stopprice:"",option:"buy"};

function gokZone() {
    let gokrr = [];

    console.log("sart'");
    data.forEach((x,i)=>{
        let gokr = {time: x.time};
        if (!gokje){

            if(dataLSA[i -1] && dataLSB[i -1].value && dataConvL[i -1].value && dataBaseL[i -1].value){
                if (dataConvL[i - 1].value <= dataBaseL[i-1].value){
                    if(dataConvL[i].value > dataBaseL[i].value){
                        inzetten = true;
                        currbet.starttime = x.time;
                        currbet.startprice = x.close;

                        gokr.open = x.close;
                        gokr.high = x.close +100;
                        gokr.low = x.close;
                        gokr.close = x.close +100;
                    }
                }
            }
        }else {
            if(dataLSA[i -1].value && dataLSB[i -1].value && dataConvL[i -1].value && dataBaseL[i -1].value){
                if (dataConvL[i - 1].value >= dataBaseL[i-1].value){
                    if(dataConvL[i].value < dataBaseL[i].value){
                        afhalen = true;
                        currbet.stoptime = x.time;
                        currbet.stopprice = x.close;
                        gokr.open = x.close;
                        gokr.high = x.close +100;
                        gokr.low = x.close;
                        gokr.close = x.close +100;
                    }
                }
            }
        }
        gokrr.push(gokr);
        if(afhalen){
            gokje = false;
            afhalen = false;
            gokjes.push(currbet);
            currbet = {starttime:"",stoptime:"",startprice:"",stopprice:"",option:"buy"};
        }
        if(inzetten){
            gokje = true;
            inzetten = false;
        }
    });
    let wv;
    let tot = 0;
    let pro = 0;
    let totpro = 0;
    let coins = 100;
    let inzet = 10;
    let hefboom = 20;
    let markers = [];

    gokjes.forEach((x,i)=>{
        coins -= inzet;
        wv = x.stopprice - x.startprice;
        console.log(i +"-> start: "+x.startprice+" stop: "+ x.stopprice+" --wv: "+wv);
        pro = (100 -((x.startprice / x.stopprice)*100));
        console.log(i +"-> %: "+ pro);
        totpro += pro;
        coins += (inzet + (pro * hefboom));
        console.log("coins: "+coins);
        tot += wv;
        markers.push({time:x.starttime,text:"buy",position:"belowBar",color:"green",shape: 'arrowUp', size: 5,});
        markers.push({time:x.stoptime,position:"aboveBar",color:"red",shape: 'arrowDown', size: 5,});

    });

    candleSeries.setMarkers(markers);

    console.log(gokrr);
    //goksjss.setData(gokrr);

    console.log("tot: "+tot);
    console.log("tot % : "+totpro);
    console.log(gokjes);
}


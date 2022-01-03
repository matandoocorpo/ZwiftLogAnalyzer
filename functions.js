var log, devices, detectedDevices, fpsData;

var openFile = function (event) {
  
  $("#spinner").attr('hidden', false)
  $("#peripherals, #metrics, #resumen").attr("hidden", true);
  var input = event.target;
  var reader = new FileReader();
  
  reader.onload = function () {
   
    var text = reader.result;
    log = text;
    getLogInfo().then(function (data) {
      createInfoTable(data);
    });
    getFPS().then(function (data) {
      plotFPS(data);
    });

    getDevices().then(function () {
      createDevicesTable();
    });

    getUDPStats().then(function (data) {
      plotUDPStats(data);
    });

    getNetworkErrors().then(function (data) {
      plotNetworkErrors(data);
    });

    getAntRxFails().then(function (data) {
      plotAntRxFails(data);
    });

    getAntPairings().then(function (data) {
      plotAntPairings(data);

    });

    $(
      "#antDevices tbody, #bleDevices tbody, #graphContainer, #resumen .card-body"
    ).empty();
    $("#spinner").attr('hidden', true)
    $("#peripherals, #metrics, #resumen").attr("hidden", false);
  };
  reader.readAsText(input.files[0]);
};

async function getLogInfo() {
  var loglines = log.split("\r\n");
  var startTime = loglines.filter((line) => line.includes("Log Time:"));
  var endTime = loglines[loglines.length - 2].substring(1, 9);
  var gameVersion = loglines.filter((line) => line.includes("Game Version:"));
  var launcherVersion = loglines.filter((line) =>
    line.includes("Launcher Version")
  );
  var GraphicsVendor = loglines.filter((line) =>
    line.includes("Graphics Vendor")
  );
  var GraphicsRenderer = loglines.filter((line) =>
    line.includes("Graphics Renderer")
  );
  var deviceRAM = loglines.filter((line) => line.includes("RAM:"));
  var deviceCPU = loglines.filter((line) => line.includes("CPU:"));
  var username = loglines.filter(line=>line.includes("Logged in user"))
  var playerID = loglines.filter(line=>line.includes("Player ID"))
  var rideOnReceived = loglines.filter(line=>line.includes("Ride on received"));
  var rideOnSent = loglines.filter(line=>line.includes("Total Ride Ons Given"))
  var logInfo = {
    startTime: startTime[0].split("]")[1].trim(),
    endTime: endTime,
    username:username[0].split("user:")[1].trim(),
    playerID:playerID[0].split("Player ID:")[1].trim(),
    rideOnSent:rideOnSent.length,
    rideOnReceived:rideOnReceived.length,
    gameVersion: gameVersion[0].split("]")[1].trim(),
    launcherVersion: launcherVersion[0].split("]")[1].trim(),
    GraphicsRenderer: GraphicsRenderer[0].split("]")[1].trim(),
    GraphicsVendor: GraphicsVendor[0].split("]")[1].trim(),
    deviceCPU: deviceCPU[0].split("]")[1].trim(),
    deviceRAM: deviceRAM[0].split("]")[1].trim(),
  };

  return logInfo;
}

async function getDevices() {
  var logLines = log.split("\r\n");
  detectedDevices = logLines.filter(
    (line) => line.includes("[ANT]") || line.includes("[BLE]")
  );
  devices = {
    ant: [],
    ble: [],
    used: [],
  };

  detectedDevices.forEach((element) => {
    element = element.substring(10).trim();
    if (element.includes(["ANT"]) && !devices.ant.includes(element)) {
      devices.ant.push(element);
    }

    if (element.includes(["BLE"]) && !devices.ble.includes(element)) {
      devices.ble.push(element);
    }
  });
}

async function getFPS() {
  var logLines = log.split("\r\n");
  var fpsData = [];
  fpsLines = logLines.filter((line) => line.includes("FPS"));
  fpsLines.forEach((line) => {
    var usefulData = line.split(",")[0];
    var measure_time = usefulData.substring(1, 9);
    var measure_fps = usefulData.split("FPS")[1].trim();
    fpsData.push([measure_time, parseFloat(measure_fps)]);
  });

  return fpsData;
}

async function getUDPStats() {
  var loglines = log.split("\r\n");
  var udpStats = {
    time: [],
    StCRx: [],
    RxError: [],
    CtSTx: [],
    TxError: [],
  };
  udpLines = loglines.filter((line) => line.includes("UDP metrics"));
  udpLines.forEach((udpLine) => {
    var measure_time = udpLine.substring(1, 9);
    var usefulData = udpLine.split("UDP metrics")[1].trim();
    usefulData = usefulData.replace("StC Rx", '"StCRx"');
    usefulData = usefulData.replace("Rx error", '"Rxerror"');
    usefulData = usefulData.replace("CtS Tx", '"CtSTx"');
    usefulData = usefulData.replace("Tx error", '"Txerror"');
    usefulData = JSON.parse(usefulData);
    udpStats.time.push(measure_time);
    udpStats.StCRx.push(usefulData.StCRx);
    udpStats.RxError.push(usefulData.Rxerror);
    udpStats.CtSTx.push(usefulData.CtSTx);
    udpStats.TxError.push(usefulData.Txerror);
  });
  return udpStats;
}

async function getAntRxFails() {
  var loglines = log.split("\r\n");
  var antRxFailsCh1 = [];
  var antRxFailsCh2 = [];
  var antRxFailsCh3 = [];
  var rxFails = [];
  var rxFailsTemplate = {
    channel: null,
    data: []
  };
  var auxChannels = [];

  antRxFailsLines = loglines.filter((line) =>
    line.includes("ANT  : Rx Fail on channel")
  );

  antRxFailsLines.forEach((line) => {
    line = line.replace(/(\r\n|\n|\r)/gm, ""); //Windows things..
    var measure_time = line.substring(1, 9);
    var eventChannel = line.substring(line.length - 1);

    if (auxChannels.includes(eventChannel) == false) {
      auxChannels.push(eventChannel);
      rxFails.push({
        channel: eventChannel,
        data: []
      });
    }

    var objIndex = rxFails.findIndex(
      (channel) => channel.channel == eventChannel
    );

    var lastItem = rxFails[objIndex].data[rxFails[objIndex].data.length - 1];
    if (rxFails[objIndex].data.length > 0 && lastItem[0] == measure_time) {
      rxFails[objIndex].data[rxFails[objIndex].data.length - 1][1]++;
    } else {
      rxFails[objIndex].data.push([measure_time, 1]);
    }
  });

  return rxFails;
}

async function getNetworkErrors() {
  var loglines = log.split("\r\n");
  var networkErrors = [];
  loglines.forEach((line) => {
    var measure_time = line.substring(1, 9);
    var lastItem = networkErrors[networkErrors.length - 1];
    if (line.includes("NETWORK:error (6)")) {
      if (networkErrors.length > 0 && lastItem[0] == measure_time) {
        networkErrors[networkErrors.length - 1][1]++;
      } else {
        networkErrors.push([measure_time, 1]);
      }
    } else {
      networkErrors.push([measure_time, 0]);
    }
  });

  return networkErrors;
}

async function getAntPairings() {

  var loglines = log.split("\r\n")

  var antDisconnects = [];

  loglines.forEach((line) => {
    var measure_time = line.substring(1, 9);
    var lastItem = antDisconnects[antDisconnects.length - 1];
    if (line.includes("ANT  : Starting ANT search")) {
      if (antDisconnects.length > 0 && lastItem[0] == measure_time) {
        antDisconnects[antDisconnects.length - 1][1]++;
      } else {
        antDisconnects.push([measure_time, 1]);
      }
    } else {
      antDisconnects.push([measure_time, 0]);
    }
  });
  return antDisconnects;
}

function plotFPS(data) {
  $("#graphContainer").append(
    `<div id='fpsGraph' class='card-body col-md-12 d-flex justify-content-center'></div>`
  );
  const fpsTime = data.map(function (item) {
    return item[0];
  });
  const fpsVal = data.map(function (item) {
    return item[1];
  });
  var fpschartDom = document.getElementById("fpsGraph");
  var fpsChart = echarts.init(fpschartDom, "dark", {
    height: 250,
    width: window.innerWidth * 0.9,
    position: "absolute",
  });
  var option;
  option = {
    animation: false,
    title: {
      text: "FPS",
    },
    tooltip: {
      trigger: "axis",
      formatter: "Time: {b0}</br>FPS: {c0}",
    },
    xAxis: {
      type: "category",
      data: fpsTime,
    },
    yAxis: {
      type: "value",
    },
    series: [{
      data: fpsVal,
      type: "line",
      smooth: true,
      areaStyle: {},
    }, ],
  };

  option && fpsChart.setOption(option);
}

function createDevicesTable() {
  $("#antDevices tbody, #bleDevices tbody").empty();
  devices.ant.forEach((device) =>
    $("#antDevices tbody").append(`<tr><td>${device}</td></tr>`)
  );
  devices.ble.forEach((device) =>
    $("#bleDevices tbody").append(`<tr><td>${device}</td></tr>`)
  );
}

function plotUDPStats(data) {
  $("#graphContainer").append(
    `<div id='udpGraph' class='card-body col-md-12 d-flex justify-content-center'></div>`
  );
  const udpTime = data.time;
  const udpStCRx = data.StCRx;
  const udpRxError = data.RxError;
  const udpCtSTx = data.CtSTx;
  const udpTxError = data.TxError;
  var udpchartDom = document.getElementById("udpGraph");
  var udpChart = echarts.init(udpchartDom, "dark", {
    height: 250,
    width: window.innerWidth * 0.9,
    position: "absolute",
  });
  var option;

  option = {
    animation: false,
    title: {
      text: "UDP Stats (pkts/minute)",
    },
    legend: {
      data: ["StC Rx", "Rx Error", "CtS Tx", "Tx Error"],
    },
    tooltip: {
      trigger: "axis",
      formatter: "Time: {b0}</br>StC: {c0}</br>Rx Error: {c1}</br>CtS: {c2}</br>Tx Error: {c3}</br>",
    },
    xAxis: {
      type: "category",
      data: data.time,
    },
    yAxis: {
      //type: 'value'
    },
    dataZoom: [],
    series: [{
        name: "StC Rx",
        data: udpStCRx,
        type: "line",
        smooth: false,
      },
      {
        name: "Rx Error",
        data: udpRxError,
        type: "line",
        smooth: false,
      },
      {
        name: "CtS Tx",
        data: udpCtSTx,
        type: "line",
        smooth: false,
      },
      {
        name: "Tx Error",
        data: udpTxError,
        type: "line",
        smooth: false,
      },
    ],
  };

  option && udpChart.setOption(option);
}

function plotAntRxFails(data) {
  data.forEach((channel) => {
    var channel_name = channel.channel;
    $("#graphContainer").append(
      `<div id='antRxFailsGraphCh${channel_name}' class='card-body col-md-12 d-flex justify-content-center'></div>`
    );

    const errorTime = channel.data.map(function (item) {
      return item[0];
    });
    const errorCount = channel.data.map(function (item) {
      return item[1];
    });

    const device = getDeviceOnChan(channel_name);
    var chartDom = document.getElementById("antRxFailsGraphCh" + channel_name);
    var errorChart = echarts.init(chartDom, "dark", {
      height: 250,
      width: window.innerWidth * 0.9,
      position: "absolute",
    });

    var option;
    option = {
      animation: false,
      title: {
        text: "ANT+ CH" + channel_name + " Rx Error | " + device,
      },
      tooltip: {
        trigger: "axis",
        formatter: "Time: {b0}</br>RxFails: {c0}",
      },
      xAxis: {
        type: "category",
        data: errorTime,
      },
      yAxis: {
        type: "value",
      },
      series: [{
        data: errorCount,
        type: "bar",
        smooth: true,
        areaStyle: {},
      }, ],
    };

    option && errorChart.setOption(option);
  });
}

function plotNetworkErrors(data) {
  $("#graphContainer").append(
    `<div id='networkErrorsGraph' class='card-body col-md-12 d-flex justify-content-center'></div>`
  );

  const errorTime = data.map(function (item) {
    return item[0];
  });
  const errorCount = data.map(function (item) {
    return item[1];
  });

  var errorNetchartDom = document.getElementById("networkErrorsGraph");
  var netErrorChart = echarts.init(errorNetchartDom, "dark", {
    height: 250,
    width: window.innerWidth * 0.9,
    position: "absolute",
  });
  var option;
  option = {
    animation: false,
    title: {
      text: "Network Errors",
    },
    tooltip: {
      trigger: "axis",
      formatter: "Time: {b0}</br>Errors: {c0}",
    },
    xAxis: {
      type: "category",
      data: errorTime,
    },
    yAxis: {
      type: "value",
    },
    series: [{
      data: errorCount,
      type: "bar",
      smooth: true,
      areaStyle: {},
    }, ],
  };

  option && netErrorChart.setOption(option);
}

function plotAntPairings(data) {
  $("#graphContainer").append(
    `<div id='antPairings' class='card-body col-md-12 d-flex justify-content-center'></div>`
  );

  const pairingTime = data.map(function (item) {
    return item[0];
  });
  const pairingCount = data.map(function (item) {
    return item[1];
  });

  var pairingChartDom = document.getElementById("antPairings");
  var pairingChart = echarts.init(pairingChartDom, "dark", {
    height: 250,
    width: window.innerWidth * 0.9,
    position: "absolute",
  });
  var option;
  option = {
    animation: false,
    title: {
      text: "ANT+ Repairings",
    },
    tooltip: {
      trigger: "axis",
      formatter: "Time: {b0}",
    },
    xAxis: {
      type: "category",
      data: pairingTime,
    },
    yAxis: {
      type: "value",
    },
    series: [{
      data: pairingCount,
      type: "bar",
      smooth: true,
      areaStyle: {},
    }, ],
  };

  option && pairingChart.setOption(option);
}

function createInfoTable(data) {
  var table = `<table class='table table-bordered table-stripped col-md-12'>
            <thead class='thead-light'>
                <tr>
                    <th class='col-md-3'>Start</th>
                    <th class='col-md-3'>End</>
                    <th class='col-md-3'>Game Version</th>
                    <th class='col-md-3'>Launcher Version</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                <td>${data.startTime}</td>
                <td>${data.endTime}</td>
                <td>${data.gameVersion}</td>
                <td>${data.launcherVersion}</td>
                </tr>
                </tbody>
                <thead class='thead-light'>
                <tr>
                    <th class='col-md-3'>Graphics Vendor</th>
                    <th class='col-md-3'>Graphics Renderer</>
                    <th class='col-md-3'>CPU</th>
                    <th class='col-md-3'>RAM</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                <td>${data.GraphicsVendor}</td>
                <td>${data.GraphicsRenderer}</td>
                <td>${data.deviceCPU}</td>
                <td>${data.deviceRAM}</td>
                </tr>
                </tbody>

                <thead class='thead-light'>
                <tr>
                    <th class='col-md-3'>User Name</th>
                    <th class='col-md-3'>Player ID</>
                    <th class='col-md-3'>Sent Ride On</th>
                    <th class='col-md-3'>Received Ride On</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                <td>${data.username}</td>
                <td>${data.playerID}</td>
                <td>${data.rideOnSent}</td>
                <td>${data.rideOnReceived}</td>
                </tr>
                </tbody>
            </table>`;
  $("#resumen .card-body").append(table);
}

function getDeviceOnChan(channel) {
  var loglines = log.split("\r\n");
  var device = loglines.filter((line) =>
    line.includes("Setting Channel ID for chan " + channel)
  );
  device = device[0].replace(/(\r\n|\n|\r)/gm, ""); //Windows things..
  var device_init = device.indexOf("(");
  var device_end = device.indexOf(")");
  var device_string = device.substring(device_init, device_end + 1);
  var device_id = device_string.split("device")[1].trim();
  device_id = device_id.substring(0, 4);
  device_string = devices.ant.filter(
    (device) =>
    device.includes(device_id) && device.indexOf("Non-Selected") == -1
  );

  return device_string[0].split(":")[1].split("[ANT]")[0];
}

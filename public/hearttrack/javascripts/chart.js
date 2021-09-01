// Check if there is an authToken before sending request. If missing, redirect to signin.html
if (!window.localStorage.getItem('authToken')) {
  window.location.replace('signin.html');
}

function getReadingsData() {
  $.ajax({
    url: '/users/readings',
    method: 'GET',
    headers: { 'x-auth' : window.localStorage.getItem("authToken") },
    dataType: 'json'
  })
    .done(function (data, textStatus, jqXHR) {

      // Create timers that will update the front end after each interval
      let updateDataInterval = setInterval(updateData, 10000);
      let updateFlagInterval = setInterval(updateFlag, 300000);

      // No data has been collected at all, display message to alert user
      if (Object.keys(data.readings).length == 0) {
        $("#messagesDaySummary").html("No data has been collected.");
        $("#messagesDaySummary").show();
        $("#messagesAllData").html("No data has been collected.");
        $("#messagesAllData").show();
        return;
      }

      else {
        $("#messagesDaySummary").hide();
      }

      // Setting up the datepicker options
      let options = {};
      options['maxDate'] = new Date(data.readings[0].date);
      options['minDate'] = new Date(data.readings[data.readings.length - 1].date);
      options['showMonthAfterYear'] = true;

      // String that will become data table's html
      let str = "<table><tr><th>Date</th><th>Time</th><th>Average BPM</th><th>Average SPO2</th></tr>";

      // Sets up the datepicker calendar
      $('.datepicker').datepicker(options);

      // Global font size for Charts
      Chart.defaults.global.defaultFontSize = 18;

      // Get date of latest readings and calculate the past week from there
      let initDay = getDateLong(new Date(data.readings[0].date));
      let finDay = getDateLong(new Date(new Date().setDate(new Date(data.readings[0].date).getDate() - 7)));
      let labels = [];

      // Get average data for heart rate and SPO2
      let dataObj = {};
      let dataHeartRateChart = [];
      let dataSPO2Chart = [];
      let currentDateIteration;


      // Finding which dates will be included (have data collected)
      for (var i = 0; i < 7; i++) {
        // Set the hours to zero for comparing reasons
        currentDateIteration = new Date(new Date().setDate(new Date(data.readings[0].date).getDate() - i));
        currentDateIteration.setHours(0,0,0,0);

        dataObj[getDateShort(currentDateIteration)] = {};
        dataObj[getDateShort(currentDateIteration)].date = currentDateIteration;
        dataObj[getDateShort(currentDateIteration)]["averageHeartRate"] = []
        dataObj[getDateShort(currentDateIteration)]["averageSPO2"] = [];

        for(let reading of data.readings) {

          // Populate table's string
          let date = getDate(new Date(reading.date));
          let time = getTime(new Date(reading.date));

          str += "<tr><td>" + date + "</td><td>" + time + "</td><td>" + reading.averageHeartRate +
          "</td><td>" + reading.averageSPO2 + "</td></tr>"

          // Change hours to zero for comparing reasons
          let day = new Date(reading.date);
          day.setHours(0,0,0,0);

          if(day.valueOf() == currentDateIteration.valueOf()) {
            dataObj[getDateShort(currentDateIteration)]["averageHeartRate"].push(reading.averageHeartRate);
            dataObj[getDateShort(currentDateIteration)]["averageSPO2"].push(reading.averageSPO2);
          }
        }

        $("#addDataTable").html(str + "</table>");

        // Remove the object for day if no data present and add a flag to labels to remove it aswell
        if(dataObj[getDateShort(currentDateIteration)]["averageHeartRate"].length == 0) {
          delete dataObj[getDateShort(currentDateIteration)];
        }

        // No data recorded in the past 7 days
        if(Object.keys(dataObj).length == 0) {
          $("#messagesWeeklySummary").html("No data collected in the past 7 days.");
          $("#messagesWeeklySummary").show();
          return;
        }

        else {
          $("#messagesWeeklySummary").hide();
        }
      }

      // Populating the labels array and the dataHeartRateChart and dataSPO2Chart array
      for(let i = 0; i < Object.keys(dataObj).length; i++) {
        labels[i] = Object.keys(dataObj)[i].valueOf();
        dataHeartRateChart[i] = 0;
        dataSPO2Chart[i] = 0;

        for (let j = 0; j < dataObj[Object.keys(dataObj)[i].valueOf()]["averageHeartRate"].length; j++) {
          dataHeartRateChart[i] += parseFloat(dataObj[Object.keys(dataObj)[i].valueOf()]["averageHeartRate"][j]);
        }

        for (let j = 0; j < dataObj[Object.keys(dataObj)[i].valueOf()]["averageSPO2"].length; j++) {
          dataSPO2Chart[i] += parseFloat(dataObj[Object.keys(dataObj)[i].valueOf()]["averageSPO2"][j]);
        }

        // These arrays contain all the averages (finally)
        dataHeartRateChart[i] = Math.round(dataHeartRateChart[i] / dataObj[Object.keys(dataObj)[i].valueOf()]["averageHeartRate"].length);
        dataSPO2Chart[i] = Math.round(dataSPO2Chart[i] / dataObj[Object.keys(dataObj)[i].valueOf()]["averageSPO2"].length);
      }

      // Add the labels for min, max and avg
      labels[labels.length] = "Week's Min";
      labels[labels.length] = "Week's Max";
      labels[labels.length] = "Week's Avg";

      // Push values for min, max and avg to data arrays
      let average = (array) => array.reduce((a, b) => a + b) / array.length;
      dataHeartRateChart[dataHeartRateChart.length] = Math.min.apply(Math, dataHeartRateChart);
      dataHeartRateChart[dataHeartRateChart.length] = Math.max.apply(Math, dataHeartRateChart);
      dataHeartRateChart[dataHeartRateChart.length] = Math.round(average(dataHeartRateChart));

      dataSPO2Chart[dataSPO2Chart.length] = Math.min.apply(Math, dataSPO2Chart);
      dataSPO2Chart[dataSPO2Chart.length] = Math.max.apply(Math, dataSPO2Chart);
      dataSPO2Chart[dataSPO2Chart.length] = Math.round(average(dataSPO2Chart));

      // Heart rate weekly summary chart
      let weeklySummaryChartHeartRateTag = $('#weeklySummaryChartHeartRateTag')[0].getContext('2d');
      let titleHeartRate = 'Average Heart Rate :   ' + initDay + "   -   " +  finDay;
      let optionsHeartRate = {
        legend: {
            display: false
        },
        scales: {
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: 'Beats Per Minute'
            },
            ticks: {
              min: (Math.ceil((Math.min.apply(Math, dataHeartRateChart)) / 2) * 2) - 2,
              max: (Math.ceil((Math.max.apply(Math, dataHeartRateChart)) / 2) * 2) + 2
            }
          }],
          xAxes: [{
            scaleLabel: {
              display: true,
              labelString: 'Date'
            }
          }]
        },
        title: {
          display: true,
          text: titleHeartRate,
          fontSize: 24,
          fontFamily: '-apple-system ,BlinkMacSystemFont, Roboto, Oxygen-Sans, sans-serif'
        }
      };

      let dataHeartRate = {
        labels: labels,
        datasets: [{
          label: 'Average Heart Rate',
          data: dataHeartRateChart,
          backgroundColor: 'rgba(255, 99, 132, 0.4)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1.5
        }]
      };

      // SPO2 weekly summary chart
      let weeklySummaryChartSPO2Tag = $('#weeklySummaryChartSPO2Tag')[0].getContext('2d');
      let titleSPO2 = 'Average SPO2 :   ' + initDay + "   -   " +  finDay;
      let optionsSPO2 = {
        legend: {
            display: false
        },
        scales: {
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: 'Percentage'
            },
            ticks: {
              min: (Math.ceil((Math.min.apply(Math, dataSPO2Chart)) / 2) * 2) - 2,
              max: (Math.ceil((Math.max.apply(Math, dataSPO2Chart)) / 2) * 2) + 2
            }
          }],
          xAxes: [{
            scaleLabel: {
              display: true,
              labelString: 'Date'
            }
          }]
        },
        title: {
          display: true,
          text: titleSPO2,
          fontSize: 24,
          fontFamily: '-apple-system ,BlinkMacSystemFont, Roboto, Oxygen-Sans, sans-serif'
        }
      };

      let dataSPO2 = {
        labels: labels,
        datasets: [{
          label: 'Average SPO2',
          data: dataSPO2Chart,
          backgroundColor: 'rgba(54, 162, 235, 0.3)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1.5
        }]
      };

      // Initializing the charts
      let weeklySummaryChartHeartRate = new Chart(weeklySummaryChartHeartRateTag, {
        type: 'bar',
        data: dataHeartRate,
        options: optionsHeartRate
      });

      let weeklySummaryChartSPO2 = new Chart(weeklySummaryChartSPO2Tag, {
        type: 'bar',
        data: dataSPO2,
        options: optionsSPO2
      });

      // Button to show and hide weekly summary charts
      $('#viewWeeklySummaryControl').click(showHideWeeklySummaryCharts);

      // Update data table
      if (Object.keys(data.readings).length != 0) {
        $("#data").show();

        // Update data table
        let str = "<table><tr><th>Date</th><th>Time</th><th>Average BPM</th><th>Average SPO2</th></tr>";

        for (let reading of data.readings) {
          let date = getDate(new Date(reading.date));
          let time = getTime(new Date(reading.date));

          str += "<tr><td>" + date + "</td><td>" + time + "</td><td>" + reading.averageHeartRate +
          "</td><td>" + reading.averageSPO2 + "</td></tr>"
        }
          $("#addDataTable").html(str + "</table>");
      }

      else {
        $("#addDataTable").html("No data has been collected");
      }

    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      let response = JSON.parse(jqXHR.responseText);
      $("#error").html("Error: " + response.message);
      $("#error").show();
    });
}

// Updates the data on the front-end
function updateData() {
  $.ajax({
    url: '/users/readings',
    method: 'GET',
    headers: { 'x-auth' : window.localStorage.getItem("authToken") },
    dataType: 'json'
  })
  .done(function (data, textStatus, jqXHR) {

    // Case where data is stored immediately after registration
    if (Object.keys(data.readings).length != 0) {
      let str = "<table><tr><th>Date</th><th>Time</th><th>Average BPM</th><th>Average SPO2</th></tr>";

      for (let reading of data.readings) {
        let date = getDate(new Date(reading.date));
        let time = getTime(new Date(reading.date));

        str += "<tr><td>" + date + "</td><td>" + time + "</td><td>" + reading.averageHeartRate +
        "</td><td>" + reading.averageSPO2 + "</td></tr>";
      }
      $("#addDataTable").html(str + "</table>");
      $("#data").show();
    }
  })
  .fail(function(jqXHR, textStatus, errorThrown) {
    let response = JSON.parse(jqXHR.responseText);
    $("#error").html("Error: " + response.message);
    $("#error").show();
  });
}

// Will alert user in case flag is high
function updateFlag() {
  $.ajax({
    url: '/users/readings',
    method: 'GET',
    headers: { 'x-auth' : window.localStorage.getItem("authToken") },
    dataType: 'json'
  })
  .done(function (data, textStatus, jqXHR) {

    // Alert that it's time for new reading
    if(data.alertFlag == 'true') {
      window.alert("Time to take a reading. Click 'Close' to continue.");
    }
  })
  .fail(function(jqXHR, textStatus, errorThrown) {
    let response = JSON.parse(jqXHR.responseText);
    $("#error").html("Error: " + response.message);
    $("#error").show();
  });
}

// Show or hide weekly summary charts function
function showHideWeeklySummaryCharts() {

  if ($('#viewWeeklySummaryControl').html() == "View Weekly Summary") {
    $('#viewWeeklySummaryControl').html("Hide Weekly Summary");
    $('#weeklyChartHeartRate').show();
    $('#weeklyChartSPO2').show();
  }

  else {
    $('#viewWeeklySummaryControl').html("View Weekly Summary");
    $('#weeklyChartHeartRate').hide();
    $('#weeklyChartSPO2').hide();
  }
}

// Show or hide day summary charts function
function showHideDaySummaryCharts() {

  if ($('#viewDaySummaryControl').html() == "Hide Day Summary") {
    $('#viewDaySummaryControl').html("Show Day Summary");
    $('#dayChartHeartRate').hide();
    $('#dayChartSPO2').hide();
  }

  else {
    $('#viewDaySummaryControl').html("Hide Day Summary");
    $('#dayChartHeartRate').show();
    $('#dayChartSPO2').show();
  }
}

function getDateLong(utcDate) {
  let options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  let date = new Intl.DateTimeFormat('en-US', options).format(utcDate);
  return date;
}

function getDateShort(utcDate) {
  let options = { weekday: 'short', day: 'numeric' };
  let date = new Intl.DateTimeFormat('en-US', options).format(utcDate);
  return date;
}

function getDate(utcDate) {
  let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  let date = new Intl.DateTimeFormat('en-US', options).format(utcDate);
  return date;
}

function getTime(utcDate) {
  options = { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false };
  let time = new Intl.DateTimeFormat('en-US', options).format(utcDate);
  return time;
}

$(function() {
  // Send request for readings data
  getReadingsData();

  // Copying values of divs that change throughout interaction so that they can comeback to original state
  let htmlCanvasHeartRate = $('#dayChartHeartRate').html();
  let htmlCanvasSPO2 = $('#dayChartSPO2').html();
  let htmlDaySummaryControl = $('#viewDaySummaryControlDiv').html();

  $('#dateSubmission').click(function() {

    // Clear the contents of the error and canvas divs every time form is submited
    $("#dayChartErrorsList").html("");
    $('#dayChartHeartRate').html(htmlCanvasHeartRate)
    $('#dayChartSPO2').html(htmlCanvasSPO2);
    $('#viewDaySummaryControlDiv').html(htmlDaySummaryControl);
    $("#messagesDaySummary").hide();
    $('#viewDaySummaryControlDiv').hide();
    $('#dayChartHeartRate').hide();
    $('#dayChartSPO2').hide();

    // Empty form is submitted
    if($('#dateSelected').val() == "") {
      $("#selectDayLabel").addClass("errorClass");
      let node = document.createElement("li");
      let textnode = document.createTextNode("A date must be selected.")
      node.appendChild(textnode);
      document.getElementById("dayChartErrorsList").appendChild(node);
      $("#dayChartErrors").show();
      return;
    }

    // Remove error class
    else {
      $("#selectDayLabel").removeClass("errorClass");
      $("#dayChartErrors").hide();
    }

    $.ajax({
      url: '/users/readings',
      method: 'GET',
      headers: { 'x-auth' : window.localStorage.getItem("authToken") },
      dataType: 'json'
    })
      .done(function (data, textStatus, jqXHR) {

        // When no data has been collected for user
        if (Object.keys(data.readings).length == 0) {
          $("#selectDayLabel").addClass("errorClass");
          let node = document.createElement("li");
          let textnode = document.createTextNode("No data has been collected.")
          node.appendChild(textnode);
          document.getElementById("dayChartErrorsList").appendChild(node);
          $("#dayChartErrors").show();
          return;
        }

        // Global font size for Charts
        Chart.defaults.global.defaultFontSize = 18;

        // Get average data for heart rate and SPO2
        let labels = [];
        let dataObj = {};
        let dataHeartRateChart = [];
        let dataSPO2Chart = [];
        let currentDateIteration;
        let date = new Date($('#dateSelected').val());

        dataObj[getDateShort(date)] = {};
        dataObj[getDateShort(date)]["averageHeartRate"] = []
        dataObj[getDateShort(date)]["averageSPO2"] = [];
        dataObj[getDateShort(date)]["time"] = [];

        // Find the date selected in database
        for(let reading of data.readings) {
          let day = new Date(reading.date);
          day.setHours(0,0,0,0);

          // Add values to dataObj
          if(day.valueOf() == date.valueOf()) {
            dataObj[getDateShort(date)]["averageHeartRate"].push(parseFloat(reading.averageHeartRate));
            dataObj[getDateShort(date)]["averageSPO2"].push(parseFloat(reading.averageSPO2));
            day = new Date(reading.date);
            let time = day.getHours();

            // Making the time pretty for the labels in the graphs
            if(day.getMinutes() < 10) {
              time += ":0" + day.getMinutes();
            }

            else {
              time += ":" + day.getMinutes();
            }
            dataObj[getDateShort(date)]["time"].push(time);
          }
        }

        // No data has been collected for selected date
        if(dataObj[getDateShort(date)].averageHeartRate.length == 0 ) {
          $("#messagesDaySummary").html("No data collected for selected date.");
          $("#messagesDaySummary").show();

          setTimeout(function() {
            $("#messagesDaySummary").hide();
          }, 10000);
          return;
        }

        else {
          $('#viewDaySummaryControl').show();
        }

        // Populating the labels array and the dataHeartRateChart and dataSPO2Chart array
        for(let i = 0; i < dataObj[getDateShort(date)]["time"].length; i++) {
          labels[i] = dataObj[getDateShort(date)]["time"][i];
          dataHeartRateChart[i] = dataObj[getDateShort(date)]["averageHeartRate"][i];
          dataSPO2Chart[i] = dataObj[getDateShort(date)]["averageSPO2"][i];
        }

        // Add the labels for min, max and avg
        labels[labels.length] = "Day's Min";
        labels[labels.length] = "Day's Max";
        labels[labels.length] = "Day's Avg";

        // Push values for min, max and avg to data arrays
        let average = (array) => array.reduce((a, b) => a + b) / array.length;
        dataHeartRateChart[dataHeartRateChart.length] = Math.min.apply(Math, dataHeartRateChart);
        dataHeartRateChart[dataHeartRateChart.length] = Math.max.apply(Math, dataHeartRateChart);
        dataHeartRateChart[dataHeartRateChart.length] = Math.round(average(dataHeartRateChart));

        dataSPO2Chart[dataSPO2Chart.length] = Math.min.apply(Math, dataSPO2Chart);
        dataSPO2Chart[dataSPO2Chart.length] = Math.max.apply(Math, dataSPO2Chart);
        dataSPO2Chart[dataSPO2Chart.length] = Math.round(average(dataSPO2Chart));

        // Heart rate for day' summary chart
        let daySummaryChartHeartRateTag = $('#daySummaryChartHeartRateTag')[0].getContext('2d');
        let titleHeartRate = 'Heart Rate :   ' + getDateLong(date);
        let optionsHeartRate = {
          legend: {
              display: false
          },
          scales: {
            yAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Beats Per Minute'
              },
              ticks: {
                min: (Math.ceil((Math.min.apply(Math, dataHeartRateChart)) / 2) * 2) - 2,
                max: (Math.ceil((Math.max.apply(Math, dataHeartRateChart)) / 2) * 2) + 2
              }
            }],
            xAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Time of Day'
              }
            }]
          },
          title: {
            display: true,
            text: titleHeartRate,
            fontSize: 24,
            fontFamily: '-apple-system ,BlinkMacSystemFont, Roboto, Oxygen-Sans, sans-serif'
          }
        };

        let dataHeartRate = {
          labels: labels,
          datasets: [{
            label: 'Heart Rate',
            data: dataHeartRateChart,
            backgroundColor: 'rgba(255, 99, 132, 0.4)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1.5
          }]
        };

        // SPO2 weekly summary chart
        let daySummaryChartSPO2Tag = $('#daySummaryChartSPO2Tag')[0].getContext('2d');
        let titleSPO2 = 'SPO2 :   ' + getDateLong(date);
        let optionsSPO2 = {
          legend: {
              display: false
          },
          scales: {
            yAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Percentage'
              },
              ticks: {
                min: (Math.ceil((Math.min.apply(Math, dataSPO2Chart)) / 2) * 2) - 2,
                max: (Math.ceil((Math.max.apply(Math, dataSPO2Chart)) / 2) * 2) + 2
              }
            }],
            xAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Time of Day'
              }
            }]
          },
          title: {
            display: true,
            text: titleSPO2,
            fontSize: 24,
            fontFamily: '-apple-system ,BlinkMacSystemFont, Roboto, Oxygen-Sans, sans-serif'
          }
        };

        let dataSPO2 = {
          labels: labels,
          datasets: [{
            label: 'SPO2',
            data: dataSPO2Chart,
            backgroundColor: 'rgba(54, 162, 235, 0.3)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1.5
          }]
        };

        // Initializing the charts
        let daySummaryChartHeartRate = new Chart(daySummaryChartHeartRateTag, {
          type: 'bar',
          data: dataHeartRate,
          options: optionsHeartRate
        });

        let daySummaryChartSPO2 = new Chart(daySummaryChartSPO2Tag, {
          type: 'bar',
          data: dataSPO2,
          options: optionsSPO2
        });

        // Show day charts
        $('#dayChartHeartRate').show();
        $('#dayChartSPO2').show();
        $('#viewDaySummaryControlDiv').show();

        // Button to show and hide weekly summary charts
        $('#viewDaySummaryControl').click(showHideDaySummaryCharts);
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        let response = JSON.parse(jqXHR.responseText);
        $("#error").html("Error: " + response.message);
        $("#error").show();
      });
  });
});

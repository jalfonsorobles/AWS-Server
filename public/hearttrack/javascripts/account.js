// Ajax GET request that will use the header to send authToken and get account info to display
function sendAccountRequest() {
  $.ajax({
    url: '/users/account',
    method: 'GET',
    headers: { 'x-auth' : window.localStorage.getItem("authToken") },
    dataType: 'json'
  })
    .done(accountInfoSuccess)
    .fail(accountInfoError);
}

// Case when ajax call is successful & html is filled with data object parameters
function accountInfoSuccess(data, textStatus, jqXHR) {
  $('#email').html(data.email);
  $('#fullName').html(data.fullName);
  $('#lastAccess').html(data.lastAccess);
  $('#main').show();

  // Add the devices to the list before the list item for the add device button (link) and
  // populates the options to ping and signal device(s).
  for (let device of data.devices) {
    $("#addDeviceForm").before("<li class='collection-item'>ID: " +
      device.deviceId + "<br>APIKEY: " + device.apiKey +
      "<br><button id='ping-" + device.deviceId + "' class='waves-effect waves-light btn'>Ping</button> " +
      "<span id='ping-" + device.deviceId + "-message'></span>" + "<br><button id='signal-" + device.deviceId +
      "' class='waves-effect waves-light btn'>Signal</button> " +
      "<span id='signal-" + device.deviceId + "-message'></span>" + "</li>");

    $("#ping-" + device.deviceId).click(function(event) {
      pingDevice(event, device.deviceId);
    });

    $("#signal-" + device.deviceId).click(function(event) {
      signalDevice(event, device.deviceId);
    });
  }

  // If no data stored, hide html content designated for data
  if (Object.keys(data.readings).length == 0) {
    $("#data").hide();
  }

  // Populating data passed from
  else {
    let str = "<table><tr><th>Date</th><th>Time</th><th>Average BPM</th><th>Average SPO2</th></tr>";

    for (let reading of data.readings) {
      let date = getDate(new Date(reading.date));
      let time = getTime(new Date(reading.date));

      str += "<tr><td>" + date + "</td><td>" + time + "</td><td>" + reading.averageHeartRate +
      "</td><td>" + reading.averageSPO2 + "</td></tr>"
    }

    $("#addDataTable").html(str + "</table>");
  }
}


// Case where ajax GET request failed
function accountInfoError(jqXHR, textStatus, errorThrown) {

  // Account authentication failed, authToken has to be deleted and user is redirected to signin.html
  if (jqXHR.status == 401) {
    window.localStorage.removeItem("authToken");
    window.location = "signin.html";
  }

  // Print any other error in hidden div
  else {
    $(".error").html("Error: " + jqXHR.status + "this error");
    $(".error").show();
  }
}

// Registers the specified device with the server.
function registerDevice() {
  $.ajax({
    url: '/devices/register',
    method: 'POST',
    headers: { 'x-auth': window.localStorage.getItem("authToken") },
    contentType: 'application/json',
    data: JSON.stringify({ deviceId: $("#deviceId").val() }),
    dataType: 'json'
   })
     .done(function (data, textStatus, jqXHR) {
       // Add new device to the device list
       $("#addDeviceForm").before("<li class='collection-item'>ID: " +
       $("#deviceId").val() + "<br>APIKEY: " + data["apiKey"] + "<br><button id='ping-" + data["deviceId"] +
        "' class='waves-effect waves-light btn'>Ping</button> " +
        "<span id='ping-" + data["deviceId"] + "-message'></span>" + "<br><button id='signal-" + data["deviceId"] +
        "' class='waves-effect waves-light btn'>Signal</button> " +
        "<span id='signal-" + data["deviceId"] + "-message'></span>" + "</li>");

         $("#ping-" + data["deviceId"]).click(function(event) {
           pingDevice(event, data["deviceId"]);
         });

         $("#signal-" + data["deviceId"]).click(function(event) {
           signalDevice(event, data["deviceId"]);
         });
       hideAddDeviceForm();
     })
     .fail(function(jqXHR, textStatus, errorThrown) {
       let response = JSON.parse(jqXHR.responseText);
       $("#error").html("Error: " + response.message);
       $("#error").show();
     });
}

// Passes deviceId to endpoint that will send POST request to ping device
function pingDevice(event, deviceId) {
  $("#ping-" + deviceId + "-message").html("");
   $.ajax({
        url: '/devices/ping',
        type: 'POST',
        headers: { 'x-auth': window.localStorage.getItem("authToken") },
        data: { 'deviceId': deviceId },
        responseType: 'json',
        success: function (data, textStatus, jqXHR) {
          let response = JSON.parse(jqXHR.responseText);
          $("#ping-" + deviceId + "-message").html(response.message);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            var response = JSON.parse(jqXHR.responseText);
            $("#error").html("Error: " + response.message);
            $("#error").show();
        }
    });
}

// Passes deviceId to endpoint that will send POST request to signal device
function signalDevice(event, deviceId) {

   $.ajax({
        url: '/devices/signal',
        type: 'POST',
        headers: { 'x-auth': window.localStorage.getItem("authToken") },
        data: { 'deviceId': deviceId },
        responseType: 'json',
        success: function (data, textStatus, jqXHR) {
          let response = JSON.parse(jqXHR.responseText);
          $("#signal-" + deviceId + "-message").html(response.message);
          setTimeout(timer, 10000);

          function timer() {
            $("#signal-" + deviceId + "-message").html("");
          }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            var response = JSON.parse(jqXHR.responseText);
            $("#error").html("Error: " + response.message);
            $("#error").show();
        }
    });
}

// Show add device form and hide the add device button (really a link)
function showAddDeviceForm() {
  $("#deviceId").val("");          // Clear the input for the device ID
  $("#addDeviceControl").hide();   // Hide the add device link
  $("#addDeviceForm").slideDown(); // Show the add device form
}

// Hides the add device form and shows the add device button (link)
function hideAddDeviceForm() {
  $("#addDeviceControl").show();   // Hide the add device link
  $("#addDeviceForm").slideUp();   // Show the add device form
  $("#error").hide();
}

$(function() {

  // Check if there is an authToken before sending request. If missing, redirect to signin.html
  if (!window.localStorage.getItem("authToken")) {
    window.location.replace("signin.html");
  }

  // Send request for account information since authToken exists
  else {
    sendAccountRequest();
  }

   // Register event listeners
  $("#addDevice").click(showAddDeviceForm);
  $("#registerDevice").click(registerDevice);
  $("#cancel").click(hideAddDeviceForm);
});


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

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
  let date = getDate(new Date(data.lastAccess));
  let time = getTime(new Date(data.lastAccess));

  $('#email').html(data.email);
  $('#fullName').html(data.fullName);
  $('#lastAccess').html(time + " on " + date);
  $('#main').show();

  // Add the devices to the list before the list item for the add device button (link) and
  // populates the options to ping and signal device(s).
  for (let device of data.devices) {
    $("#addDeviceForm").before("<li class='collection-item' id='device-" + device.deviceId +
    "'><span class='tab'>DEVICE ID:</span>" + device.deviceId + "<br><span class='tab'>APIKEY:</span>" +
    device.apiKey + "<br><span class='tab'>Start Hour:</span><span id='startHour-" + device.deviceId + "'>" +
    device.startHour + "</span>:00 <br><span class='tab'>End Hour:</span><span id='endHour-" +
    device.deviceId + "'>" + device.endHour + "</span>:00" +
    "<br><span class='tab'>Frequency:</span><span id='operatingFrequency-" + device.deviceId + "'>" +
    device.operatingFrequency + "</span> minutes<br><button id='ping-" + device.deviceId +
    "' class='waves-effect waves-light btn'>Ping</button> " + "<span id='ping-" + device.deviceId +
    "-message'></span>" + "<br><button id='signal-" + device.deviceId +
    "' class='waves-effect waves-light btn'>Signal</button> " + "<span id='signal-" + device.deviceId +
    "-message'></span>" + "</li>");

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

  // Populating data passed from database, only showing the last 5 readings
  else {
    $("#data").show();
    let str = "<table><tr><th>Date</th><th>Time</th><th>Average BPM</th><th>Average SPO2</th></tr>";
    let numRecentReadings = 4;
    let currReading = 0;

    for (let reading of data.readings) {
      let date = getDate(new Date(reading.date));
      let time = getTime(new Date(reading.date));

      str += "<tr><td>" + date + "</td><td>" + time + "</td><td>" + reading.averageHeartRate +
      "</td><td>" + reading.averageSPO2 + "</td></tr>";

      currReading++;

      // Stop after 5 readings
      if(currReading >= numRecentReadings) {
        break;
      }
    }
    $("#addDataTable").html(str + "</table>");
  }

  // NoUiSlider tool
  var sliderHours = document.getElementById('sliderHours');
  var sliderFrequency = document.getElementById('sliderFrequency');

  var sliderHoursValueElement = document.getElementById('sliderHoursValue');
  var sliderFrequencyValueElement = document.getElementById('sliderFrequencyValue');

  noUiSlider.create(sliderHours, {
    start: [6, 22],
    connect: true,
    step: 1,
    orientation: 'horizontal',
    range: {
        'min': 0,
        'max': 23
    },
    format: wNumb({
      decimals: 0
      }),
    format: {
      // 'to' the formatted value. Receives a number.
      to: function (value) {
          return Math.ceil(value);
      },
      // 'from' the formatted value. Receives a string, should return a number.
      from: function (value) {
          return value
      }
    }
  });

  sliderHours.noUiSlider.on('update', function (values, handle) {
      sliderHoursValueElement.innerHTML = "<span class='tab'>New hours:</span> " +
      values[0] + ":00 - " + values[1] + ":00";
  });

  noUiSlider.create(sliderFrequency, {
      start: [30],
      connect: true,
      step: 15,
      orientation: 'horizontal',
      range: {
          'min': [15],
          'max': [240]
      },
      format: wNumb({
        decimals: 0
        }),
      format: {
        // 'to' the formatted value. Receives a number.
        to: function (value) {
            return (parseInt(value / 15) * 15);
        },
        // 'from' the formatted value. Receives a string, should return a number.
        from: function (value) {
            return value
        }
      }
  });

  sliderFrequency.noUiSlider.on('update', function (values, handle) {
      sliderFrequencyValueElement.innerHTML = "<span class='tab'>New Frequency:</span> " +
      values[handle] + " minutes";
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
      $("#data").show();
      let str = "<table><tr><th>Date</th><th>Time</th><th>Average BPM</th><th>Average SPO2</th></tr>";
      let numRecentReadings = 4;
      let currReading = 0;

      for (let reading of data.readings) {
        let date = getDate(new Date(reading.date));
        let time = getTime(new Date(reading.date));

        str += "<tr><td>" + date + "</td><td>" + time + "</td><td>" + reading.averageHeartRate +
        "</td><td>" + reading.averageSPO2 + "</td></tr>";

        currReading++;

        // Stop after 5 readings
        if(currReading >= numRecentReadings) {
          break;
        }
      }
      $("#addDataTable").html(str + "</table>");
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
  // Clear the contents of the error div every time form is submited
  $("#deviceErrorsList").html("");

  // Empty form is submitted
  if($("#addDeviceId").val() == "") {
    $("#addDeviceIdLabel").addClass("errorClass");
    let node = document.createElement("li");
    let textnode = document.createTextNode("Enter a Device ID to register.")
    node.appendChild(textnode);
    document.getElementById("deviceErrorsList").appendChild(node);
    $("#deviceErrors").show();
  }

  else {
    // Remove error class
    $("#addDeviceIdLabel").removeClass("errorClass");

    $.ajax({
      url: '/devices/register',
      method: 'POST',
      headers: { 'x-auth': window.localStorage.getItem("authToken") },
      contentType: 'application/json',
      data: JSON.stringify({ deviceId: $("#addDeviceId").val() }),
      dataType: 'json'
     })
       .done(function (data, textStatus, jqXHR) {
         // Add new device to the device list
         $("#addDeviceForm").before("<li class='collection-item' id='device-" + data["deviceId"] +
         "'><span class='tab'>DEVICE ID:</span>" + $("#addDeviceId").val() + "<br><span class='tab'>APIKEY:</span>" +
         data["apiKey"] + "<br><span class='tab'>Start Hour:</span><span id='startHour-" + data["deviceId"] + "'>" +
         data["startHour"] + "</span>:00 <br><span class='tab'>End Hour:</span><span id='endHour-" + data["deviceId"] +
         "'>" + data["endHour"] + "</span>:00" +
         "<br><span class='tab'>Frequency:</span><span id='operatingFrequency-" + data["deviceId"] + "'>" +
         data["operatingFrequency"] + "</span> minutes<br><button id='ping-" + data["deviceId"] +
         "' class='waves-effect waves-light btn'>Ping</button> " + "<span id='ping-" + data["deviceId"] +
         "-message'></span>" + "<br><button id='signal-" + data["deviceId"] +
         "' class='waves-effect waves-light btn'>Signal</button> " + "<span id='signal-" +
         data["deviceId"] + "-message'></span>" + "</li>");

          $("#ping-" + data["deviceId"]).click(function(event) {
             pingDevice(event, data["deviceId"]);
          });

          $("#signal-" + data["deviceId"]).click(function(event) {
             signalDevice(event, data["deviceId"]);
          });

          $("#messagesDevice").html(data.message);
          hideAddDeviceForm();
          $("#messagesDevice").css('color', '#26a69a');
          $("#messagesDevice").show();

          setTimeout(function() {
            $("#messagesDevice").hide();
          }, 10000);
       })
       .fail(function(jqXHR, textStatus, errorThrown) {
         $("#addDeviceIdLabel").addClass("errorClass");
         let response = JSON.parse(jqXHR.responseText);
         $("#messagesDevice").html(response.message);
         $("#messagesDevice").css('color', 'red');
         $("#messagesDevice").show();

         setTimeout(function(){
           $("#messagesDevice").hide();
         }, 10000);
       });
  }
}

// Removes the specified device from the server.
function removeDevice() {
  // Clear the contents of the error div every time form is submited
  $("#deviceErrorsList").html("");

  // Empty form is submitted
  if($("#deleteDeviceId").val() == "") {
    $("#deleteDeviceIdLabel").addClass("errorClass");
    let node = document.createElement("li");
    let textnode = document.createTextNode("Enter a Device ID to remove.")
    node.appendChild(textnode);
    document.getElementById("deviceErrorsList").appendChild(node);
    $("#deviceErrors").show();
  }

  else {
    // Remove error class
    $("#deleteDeviceIdLabel").removeClass("errorClass");

    $.ajax({
      url: '/devices/remove',
      method: 'POST',
      headers: { 'x-auth': window.localStorage.getItem("authToken") },
      contentType: 'application/json',
      data: JSON.stringify({ 'deviceId': $("#deleteDeviceId").val() }),
      dataType: 'json'
     })
      .done(function (data, textStatus, jqXHR) {
       let response = JSON.parse(jqXHR.responseText);
       // Remove device from the device list
       $("#device-" + $("#deleteDeviceId").val()).remove();
       $("#messagesDevice").html(response.message);
       $("#messagesDevice").css('color', '#26a69a');
       hideDeleteDeviceForm();
       $("#messagesDevice").show();

       setTimeout(function() {
         $("#messagesDevice").hide();
       }, 10000);
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
       let response = JSON.parse(jqXHR.responseText);
       $("#deleteDeviceIdLabel").addClass("errorClass");
       $("#messagesDevice").html(response.message);
       $("#messagesDevice").css('color', 'red');
       $("#messagesDevice").show();

       setTimeout(function() {
         $("#messagesDevice").hide();
       }, 10000);
      });
  }
}

// Updates the specified device's hours of operation.
function updateOperatingHoursFrequency() {
  // Clear the contents of the error div every time form is submited
  $("#deviceErrorsList").html("");

  // Empty form is submitted
  if($("#updateDeviceId").val() == "") {
    $("#updateDeviceLabel").addClass("errorClass");
    let node = document.createElement("li");
    let textnode = document.createTextNode("Enter a Device ID to update operating hours.")
    node.appendChild(textnode);
    document.getElementById("deviceErrorsList").appendChild(node);
    $("#deviceErrors").show();
  }

  else {
    // Remove error class
    $("#updateDeviceLabel").removeClass("errorClass");

    // Array that holds values of new operating times
    let operatingTimes = sliderHours.noUiSlider.get();
    let operatingFrequency = parseInt(sliderFrequency.noUiSlider.get());

    $.ajax({
      url: '/devices/updateDevice',
      method: 'POST',
      headers: { 'x-auth': window.localStorage.getItem("authToken") },
      contentType: 'application/json',
      data: JSON.stringify({ 'deviceId': $("#updateDeviceId").val(), 'startHour': operatingTimes[0],
                             'endHour': operatingTimes[1], 'operatingFrequency': operatingFrequency }),
      dataType: 'json'
     })
      .done(function (data, textStatus, jqXHR) {
       let response = JSON.parse(jqXHR.responseText);

       // Success in updating both the database and the device
       if (response.updated == true) {
         // Update hours on device information
         $("#startHour-" + $("#updateDeviceId").val()).html(operatingTimes[0]);
         $("#endHour-" + $("#updateDeviceId").val()).html(operatingTimes[1]);
         $("#operatingFrequency-" + $("#updateDeviceId").val()).html(operatingFrequency);
         $("#messagesDevice").html(response.message);
         $("#messagesDevice").css('color', '#26a69a');
         hideUpdateDeviceHoursForm();
         $("#messagesDevice").show();

         setTimeout(function() {
           $("#messagesDevice").hide();
         }, 10000);
       }

       else {
         $("#messagesDevice").html(response.message);
         $("#messagesDevice").css('color', 'red');
         $("#messagesDevice").show();

         setTimeout(function() {
           $("#messagesDevice").hide();
         }, 10000);
       }
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
       let response = JSON.parse(jqXHR.responseText);
       $("#updateDeviceLabel").addClass("errorClass");
       $("#messagesDevice").html(response.message);
       $("#messagesDevice").css('color', 'red');
       $("#messagesDevice").show();

       setTimeout(function() {
         $("#messagesDevice").hide();
       }, 10000);
      });
  }
}

// Passes deviceId to endpoint that will send POST request to ping device
function pingDevice(event, deviceId) {
  $("#ping-" + deviceId + "-message").html("");
   $.ajax({
        url: '/devices/ping',
        type: 'POST',
        headers: { 'x-auth': window.localStorage.getItem("authToken") },
        data: { 'deviceId': deviceId, 'signalCode': 1 },
        responseType: 'json',
        success: function (data, textStatus, jqXHR) {
          let response = JSON.parse(jqXHR.responseText);

          if(response.success) {
            let time = getTime(new Date());
            $("#ping-" + deviceId + "-message").html(response.message + time);
          }

          else {
            $("#ping-" + deviceId + "-message").html(response.message);
          }
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
  $("#signal-" + deviceId + "-message").html("");

  // Check whether device is signaling or not
  if(document.getElementById("signal-" + deviceId).innerText == "SIGNAL") {
    $.ajax({
      url: '/devices/signal',
      type: 'POST',
      headers: { 'x-auth': window.localStorage.getItem("authToken") },
      data: { 'deviceId': deviceId, 'signalCode': 1 },
      responseType: 'json',
      success: function (data, textStatus, jqXHR) {
        let response = JSON.parse(jqXHR.responseText);
        $("#signal-" + deviceId + "-message").html(response.message);

        if(response.success == true) {
          // Took me a while to figure out that innerHTML does not work with JQuery >:)
          document.getElementById("signal-" + deviceId).innerText = "STOP SIGNALING";
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        var response = JSON.parse(jqXHR.responseText);
        $("#error").html("Error: " + response.message);
        $("#error").show();
      }
    });
  }

  // Device is signaling and will be stopped
  else {
    $.ajax({
      url: '/devices/signal',
      type: 'POST',
      headers: { 'x-auth': window.localStorage.getItem("authToken") },
      data: { 'deviceId': deviceId, 'signalCode': 0 },
      responseType: 'json',
      success: function (data, textStatus, jqXHR) {
        let response = JSON.parse(jqXHR.responseText);
        $("#signal-" + deviceId + "-message").html(response.message);

        // Took me a while to figure out that innerHTML does not work with JQuery >:)
        document.getElementById("signal-" + deviceId).innerText = "SIGNAL";
      },
      error: function(jqXHR, textStatus, errorThrown) {
        var response = JSON.parse(jqXHR.responseText);
        $("#error").html("Error: " + response.message);
        $("#error").show();
      }
    });
  }
}

// Updates the full name on both the database and the front-end
function updateName() {
  // Clear the contents of the error div every time form is submited
  $("#fullNameErrorsList").html("");

  // Empty form is submitted
  if($("#updateFullName").val() == "") {
    $("#fullNameLabel").addClass("errorClass");
    let node = document.createElement("li");
    let textnode = document.createTextNode("Full name cannot be blank.")
    node.appendChild(textnode);
    document.getElementById("fullNameErrorsList").appendChild(node);
    $("#fullNameErrors").show();
  }

  else {
    // Remove error class
    $("#fullNameLabel").removeClass("errorClass");

    $.ajax({
      url: '/users/updateName',
      method: 'POST',
      headers: { 'x-auth': window.localStorage.getItem("authToken") },
      contentType: 'application/json',
      data: JSON.stringify({ 'fullName': $("#updateFullName").val() }),
      dataType: 'json'
     })
      .done(function (data, textStatus, jqXHR) {

        // Name was changed successfully and will be updated in account.html
        if(data.success == true) {
          hideUpdateNameForm();

          // Front-end will be updated and message shown for 10 seconds
          $('#fullName').html($("#updateFullName").val());
          $("#messagesUser").html(data.message);
          $("#messagesUser").show();

          setTimeout(function() {
            $("#messagesUser").hide();
          }, 10000);

         }
       })
       .fail(function(jqXHR, textStatus, errorThrown) {
         let response = JSON.parse(jqXHR.responseText);
         $("#error").html("Error: " + response.message);
         $("#error").show();
       });
  }
}

// Updates the full name on both the database and the front-end
function updatePassword() {
  let password = $("#newPassword");
  let passwordConfirm = $("#confirmNewPassword");
  let validPassword = true;
  let validConfirmPassword = true;

  // Create regular expression for password format
  let passwordRegEx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,20}$/;

  // Clear the contents of the error div every time form is submited
  $("#passwordErrorsList").html("");

  // Testing password validness `
  if (passwordRegEx.test(password.val())) {
    // Remove the error class, in case it was previously added.
    $("#newPasswordLabel").removeClass("errorClass");
    validPassword = true;
  }

  // When password input has an error
  else {
    // Add the error class, which defines a bold red font
    $("#newPasswordLabel").addClass("errorClass");

    if (password.val().length < 10 || password.val().length > 20) {
      // Create a <li> node
      let node = document.createElement("li");
      // Create a text node
      let textnode = document.createTextNode("Password must be between 10 and 20 characters.");
      // Append the text to <li>
      node.appendChild(textnode);
      // Append <li> to <ul> with id="errors"
      document.getElementById("passwordErrorsList").appendChild(node);
    }

    let validLower = false;
    let validUpper = false;
    let validDigit = false;

    for (let index = 0; index < password.val().length; index++) {
      let char = password.val()[index];

      // Testing for lowercase letter
      if (char == char.toLowerCase() && isNaN(char)) {
        validLower = true;
      }

      // Testing for uppercase letter
      if (char == char.toUpperCase() && isNaN(char)) {
        validUpper = true;
      }

      // Testing for digit
      if (!isNaN(char)) {
        validDigit = true;
      }
    }

    if (validLower == false) {
      // Create a <li> node
      let node = document.createElement("li");
      // Create a text node
      let textnode = document.createTextNode("Password must contain at least one lowercase character.");
      // Append the text to <li>
      node.appendChild(textnode);
      // Append <li> to <ul> with id="errors"
      document.getElementById("passwordErrorsList").appendChild(node);
    }

    if (validUpper == false) {
      // Create a <li> node
      let node = document.createElement("li");
      // Create a text node
      let textnode = document.createTextNode("Password must contain at least one uppercase character.");
      // Append the text to <li>
      node.appendChild(textnode);
      // Append <li> to <ul> with id="errors"
      document.getElementById("passwordErrorsList").appendChild(node);
    }

    if (validDigit == false) {
      // Create a <li> node
      let node = document.createElement("li");
      // Create a text node
      let textnode = document.createTextNode("Password must contain at least one digit.");
      // Append the text to <li>
      node.appendChild(textnode);
      // Append <li> to <ul> with id="errors"
      document.getElementById("passwordErrorsList").appendChild(node);
    }
    validPassword = false;
  }

  if (password.val() == passwordConfirm.val()) {
    // Remove the error class, in case it was previously added.
    $("#confirmNewPasswordLabel").removeClass("errorClass");
    validConfirmPassword = true;
  }

  else {
      // Add the error class, which defines a 2px red border
      $("#confirmNewPasswordLabel").addClass("errorClass");
      // Create a <li> node
      let node = document.createElement("li");
      // Create a text node
      let textnode = document.createTextNode("Passwords do not match.");
      // Append the text to <li>
      node.appendChild(textnode);
      // Append <li> to <ul> with id="errors"
      document.getElementById("passwordErrorsList").appendChild(node);
      validConfirmPassword = false;
    }

  if (validPassword == false || validConfirmPassword == false) {
    // Make the formErrors div visible
    $("#passwordErrors").show();
  }

  else {
    $("#passwordErrors").hide();

    $.ajax({
      url: '/users/updatePassword',
      method: 'POST',
      headers: { 'x-auth': window.localStorage.getItem("authToken") },
      contentType: 'application/json',
      data: JSON.stringify({ 'newPassword': password.val() }),
      dataType: 'json'
     })
       .done(function (data, textStatus, jqXHR) {

         // Password was changed successfully and will be updated in account.html
         if(data.success == true) {
           hideUpdatePasswordForm();

           // Front-end will be updated and message shown for 10 seconds
           $("#messagesUser").html(data.message);
           $("#messagesUser").show();

          setTimeout(function() {
            $("#messagesUser").hide();
          }, 10000);
         }
       })
       .fail(function(jqXHR, textStatus, errorThrown) {
         let response = JSON.parse(jqXHR.responseText);
         $("#error").html("Error: " + response.message);
         $("#error").show();
       });

  }
}

// Show update name form and hide the update name button (really a link)
function showUpdateNameForm() {
  $("#updateFullName").val("");       // Clear the input for full name
  $("#updateNameControl").hide();     // Hide the update name link
  $("#updateNameForm").slideDown();   // Show the update name form
}

// Hides the update name form and shows the update name button (link)
function hideUpdateNameForm() {
  $("#updateNameControl").show();     // Show the update name link
  $("#updateNameForm").slideUp();     // Hide the update name form
  $("#fullNameErrors").hide();
  $("#fullNameLabel").removeClass("errorClass");
}

// Show update password form and hide the update password button (really a link)
function showUpdatePasswordForm() {
  $("#newPassword").val("");                                // Clear the input for new password
  $("#confirmNewPassword").val("");                         // Clear the input for confirm new password
  $("#updatePasswordControl").hide();                       // Hide the update password link
  $("#updatePasswordForm").slideDown();                     // Show the update password form
}

// Hides the update password form and shows the update password button (link)
function hideUpdatePasswordForm() {
  $("#updatePasswordControl").show();                       // Show the update password link
  $("#updatePasswordForm").slideUp();                       // Hide the update password form
  $("#passwordErrors").hide();                              // Remove error div
  $("#confirmNewPasswordLabel").removeClass("errorClass");  // Remove error class from label
  $("#newPasswordLabel").removeClass("errorClass");         // Remove error class from label
}

// Show add device form and hide the add device button (really a link)
function showAddDeviceForm() {
  $("#addDeviceId").val("");          // Clear the input for the device ID
  $("#addDeviceControl").hide();      // Hide the add device link
  $("#addDeviceForm").slideDown();    // Show the add device form
}

// Hides the add device form and shows the add device button (link)
function hideAddDeviceForm() {
  $("#addDeviceControl").show();                        // Show the add device link
  $("#addDeviceForm").slideUp();                        // Hide the add device form
  $("#deviceErrors").hide();
  $("#messagesDevice").hide();
  $("#addDeviceIdLabel").removeClass("errorClass");
}

// Show remove device form and hide the remove device button (really a link)
function showDeleteDeviceForm() {
  $("#deleteDeviceId").val("");       // Clear the input for the device ID
  $("#deleteDeviceControl").hide();   // Hide the remove device link
  $("#deleteDeviceForm").slideDown(); // Show the remove device form
}

// Hides the remove device form and shows the remove device button (link)
function hideDeleteDeviceForm() {
  $("#deleteDeviceControl").show();                     // Show the remove device link
  $("#deleteDeviceForm").slideUp();                     // Hide the remove device form
  $("#deleteDeviceIdLabel").removeClass("errorClass");  // Removes error classes
  $("#messagesDevice").hide();                          // Hides previous messages
  $("#deviceErrors").hide();                            // Hides previous error messages
}

// Show update device hours form and hide the button (really a link)
function showUpdateDeviceHoursForm() {
  $("#updateDeviceId").val("");          // Clear the input for the device ID
  $("#updateOperatingHoursControl").hide();   // Hide the update hours link
  $("#updateDeviceForm").slideDown();          // Show the update hours form
}

// Hides the update device hours form and shows the button (link)
function hideUpdateDeviceHoursForm() {
  $("#updateOperatingHoursControl").show();               // Show the update hours link
  $("#updateDeviceForm").slideUp();                        // Hide the update hours form
  $("#deviceErrors").hide();                              // Hides previous error messages
  $("#messagesDevice").hide();                            // Hides previous messages
  $("#updateDeviceLabel").removeClass("errorClass"); // Removes error classes
}

$(function() {

  // Check if there is an authToken before sending request. If missing, redirect to signin.html
  if (!window.localStorage.getItem("authToken")) {
    window.location.replace("signin.html");
  }

  else {
    // Send request for account information since authToken exists
    sendAccountRequest();

    // Create timers that will update the front end after each interval
    let updateDataInterval = setInterval(updateData, 10000);
    let updateFlagInterval = setInterval(updateFlag, 300000);
  }

  // Register event listeners
  $("#updateNameLink").click(showUpdateNameForm);
  $("#updateName").click(updateName);
  $("#cancelUpdateName").click(hideUpdateNameForm);

  $("#updatePasswordLink").click(showUpdatePasswordForm);
  $("#updatePassword").click(updatePassword);
  $("#cancelUpdatePassword").click(hideUpdatePasswordForm);

  $("#addDeviceLink").click(showAddDeviceForm);
  $("#registerDevice").click(registerDevice);
  $("#cancelRegister").click(hideAddDeviceForm);

  $("#deleteDeviceLink").click(showDeleteDeviceForm);
  $("#removeDevice").click(removeDevice);
  $("#cancelDelete").click(hideDeleteDeviceForm);

  $("#updateOperatingHoursLink").click(showUpdateDeviceHoursForm);
  $("#updateOperatingHoursFrequency").click(updateOperatingHoursFrequency);
  $("#cancelUpdateOperatingHours").click(hideUpdateDeviceHoursForm);

  // Register 'enter' key in forms
  $("#updateFullName").keypress(function(event) {
    if (event.which === 13) {
      updateName();
    }
  });

  $("#newPassword").keypress(function(event) {
    if (event.which === 13) {
      updatePassword();
    }
  });

  $("#confirmNewPassword").keypress(function(event) {
    if (event.which === 13) {
      updatePassword();
    }
  });

  $("#addDeviceId").keypress(function(event) {
    if (event.which === 13) {
      registerDevice();
    }
  });

  $("#deleteDeviceId").keypress(function(event) {
    if (event.which === 13) {
      removeDevice();
    }
  });

  $("#updateDeviceId").keypress(function(event) {
    if (event.which === 13) {
      updateOperatingHoursFrequency();
    }
  });
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

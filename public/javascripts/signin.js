// Replaces the website visited in browser so that when the back button is cliked,
// client is sent to the right website and updates last access date
if (window.localStorage.getItem("authToken")) {

  $.ajax({
    url: '/users/updateLastAccessDate',
    method: 'POST',
    contentType: 'application/json',
    headers: { 'x-auth' : window.localStorage.getItem("authToken") },
    dataType: 'json'
  })
    .done(function (data) {
      window.location.replace("account.html");
    })
    .fail(function (data) {
      console.log(data);
    })
}

// Ajax POST function that will execute when client side form is submitted
function sendSigninRequest() {

  // Hide the contents of the error div every time form is submited
  $('#ServerResponse').hide();
  $("#emailLabel").removeAttr("style");
  $("#passwordLabel").removeAttr("style");

  // Missing email when form submitted
  if($('#email').val() == "" || $('#password').val() == "") {

    if($('#email').val() == "") {
      $("#emailLabel").css({ "text-shadow" : "0 0 2px black, 0 0 2px black, 0 0 2px black, 0 0 2px black",
      "color" : "red", "font-weight" : "bold" });
    }

    if($('#password').val() == "") {
      $("#passwordLabel").css({ "text-shadow" : "0 0 2px black, 0 0 2px black, 0 0 2px black, 0 0 2px black",
      "color" : "red", "font-weight" : "bold" });
    }

    $("#ServerResponse").html("<div class='errorClass'> Error: Enter an email address and password.</div>");
    $('#ServerResponse').show();
  }

  // Complete form submitted
  else {
    $('#ServerResponse').hide();

    $.ajax({
      url: '/users/signin',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ email: $('#email').val().toLowerCase(), password: $('#password').val() }),
      dataType: 'json'
    })
      .done(signinSuccess)
      .fail(signinFailure);
  }
}

// User was authenticated successfully and redirected to account.html
function signinSuccess(data, testStatus, jqXHR) {
  window.localStorage.setItem('authToken', data.authToken);
  window.location = "account.html";
}

function signinFailure(jqXHR, testStatus, errorThrown) {

  // Case where there was an authentication failure
  if (jqXHR.status == 401) {
     $('#ServerResponse').html("<div class='errorClass'>Error: " + jqXHR.responseJSON.message +"</div>");
     $('#ServerResponse').show();
  }

  // Case where the server could not be reached
  else {
     $('#ServerResponse').html("<div class='errorClass'>Server could not be reached.</div>");
     $('#ServerResponse').show();
  }
}

$(function() {

  // When 'signin' button is clicked
  $("#signin").click(sendSigninRequest);

  // When 'enter' key is pressed in password field
  $("#password").keypress(function(event) {
    if (event.which === 13) {
      sendSigninRequest();
    }
  });

  // When 'enter' key is pressed in email field
  $("#email").keypress(function(event) {
    if (event.which === 13) {
      sendSigninRequest();
    }
  });
});

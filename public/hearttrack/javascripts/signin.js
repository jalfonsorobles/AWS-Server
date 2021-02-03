// Replaces the website visited in browser so that when the back button is cliked, client is sent to the right website
if (window.localStorage.getItem("authToken")) {
  window.location.replace("account.html");
}

// Ajax POST function that will execute when client side form is submitted
function sendSigninRequest() {
  console.log("inside sendsigninRequest");
  $.ajax({
    url: '/users/signin',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ email: $('#email').val(), password: $('#password').val() }),
    dataType: 'json'
  })
    .done(signinSuccess)
    .fail(signinFailure);
}

// FIXME: add error attributes when submitting incomplete form

// User was authenticated successfully and redirected to account.html
function signinSuccess(data, testStatus, jqXHR) {
  window.localStorage.setItem('authToken', data.authToken);
  window.location = "account.html";
}

function signinFailure(jqXHR, testStatus, errorThrown) {

  // Case where there was an authentication failure
  if (jqXHR.status == 401) {
     $('#ServerResponse').html("<div class='error'>Error: " + jqXHR.responseJSON.message +"</div>");
     $('#ServerResponse').show();
  }

  // Case where the server could not be reached
  else {
     $('#ServerResponse').html("<div class='error'>Server could not be reached.</div>");
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

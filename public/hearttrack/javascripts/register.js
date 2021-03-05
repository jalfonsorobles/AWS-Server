function sendRegisterRequest() {
  let email = $('#email').val();
  let password = $('#password').val();
  let fullName = $('#fullName').val();
  let passwordConfirm = $('#passwordConfirm').val();

  // FIXME: add error attributes when submitting incomplete form

  // Check to make sure the passwords match in client side before submitting
  if (password != passwordConfirm) {
    $('#ServerResponse').html("<div class='error'>Passwords do not match.</div>");
    $('#ServerResponse').show();
    return;
  }

  else {
    $('#ServerResponse').hide();
  }

  // ajax POST that is executed when client side form is submitted
  $.ajax({
    url: '/users/register',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ email: email, fullName: fullName, password: password }),
    dataType: 'json'
  })
    .done(registerSuccess)
    .fail(registerError);
}

// Success in registering new user
function registerSuccess(data, textStatus, jqXHR) {
  console.log("success registering");

  // Redirect client to signin.html to signin and verify credentials
  if (data.success) {
    window.location = "signin.html";
  }

  // Display in hidden div error message
  else {
    $('#ServerResponse').html("<div class='error'>Error: " + data.message + "</div>");
    $('#ServerResponse').show();
  }
}

// Error upon registering user
function registerError(jqXHR, textStatus, errorThrown) {
  console.log("error registering");

  // When server cannot be reached
  if (jqXHR.statusCode == 404) {
    $('#ServerResponse').html("<div class='error'>Server could not be reached.</div>");
    $('#ServerResponse').show();
  }

  // Display other error other than a 404
  else {
    $('#ServerResponse').html("<div class='error'>Error: " + jqXHR.responseJSON.message + "</div>");
    $('#ServerResponse').show();
  }
}

// Event listerner added to 'register' button and all fields
$(function() {
  $('#register').click(sendRegisterRequest);

  $("#passwordConfirm").keypress(function(event) {
    if (event.which === 13) {
      sendRegisterRequest();
    }
  });

  $("#password").keypress(function(event) {
    if (event.which === 13) {
      sendRegisterRequest();
    }
  });

  $("#fullName").keypress(function(event) {
    if (event.which === 13) {
      sendRegisterRequest();
    }
  });

  $("#email").keypress(function(event) {
    if (event.which === 13) {
      sendRegisterRequest();
    }
  });
});

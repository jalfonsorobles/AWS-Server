function sendRegisterRequest() {
  let email = $('#email');
  let password = $('#password');
  let fullName = $('#fullName');
  let passwordConfirm = $('#passwordConfirm');

  // Clear the contents of the error div every time form is submited
  $("#passwordErrorsList").html("");
  $('#ServerResponse').hide();
  $("#passwordLabel").removeAttr("style");
  $("#emailLabel").removeAttr("style");
  $("#fullNameLabel").removeAttr("style");
  $("#confirmPasswordLabel").removeAttr("style");

  // When submitting incomplete form
  if (email.val() == "" || password.val() == "" || fullName.val() == "" || passwordConfirm.val() == "") {
    $('#ServerResponse').html("<div class='errorClass'>Error: Fill out all the form entries</div>");
    $('#ServerResponse').show();

    if(email.val() == "") {
      $("#emailLabel").css({ "text-shadow" : "0 0 2px black, 0 0 2px black, 0 0 2px black, 0 0 2px black",
      "color" : "red", "font-weight" : "bold" });
    }

    if(fullName.val() == "") {
      $("#fullNameLabel").css({ "text-shadow" : "0 0 2px black, 0 0 2px black, 0 0 2px black, 0 0 2px black",
      "color" : "red", "font-weight" : "bold" });
    }

    if(password.val() == "") {
      $("#passwordLabel").css({ "text-shadow" : "0 0 2px black, 0 0 2px black, 0 0 2px black, 0 0 2px black",
      "color" : "red", "font-weight" : "bold" });
    }

    if(passwordConfirm.val() == "") {
      $("#confirmPasswordLabel").css({ "text-shadow" : "0 0 2px black, 0 0 2px black, 0 0 2px black, 0 0 2px black",
      "color" : "red", "font-weight" : "bold" });
    }
  }

  // Complete form submitted
  else {
    // Create regular expression for password format
    let passwordRegEx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,20}$/;

    // Testing password validness `
    if (passwordRegEx.test(password.val())) {
      // Remove the error class, in case it was previously added.
      $("#passwordLabel").removeAttr("style");
      validPassword = true;
    }

    // When password input has an error
    else {
      // Add the error class, which defines a bold red font
      $("#passwordLabel").css({ "text-shadow" : "0 0 2px black, 0 0 2px black, 0 0 2px black, 0 0 2px black",
      "color" : "red", "font-weight" : "bold" });

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
        $("#confirmPasswordLabel").removeAttr("style");
      validConfirmPassword = true;
    }

    else {
        // Add the error class, which defines a 2px red border
        $("#confirmPasswordLabel").css({ "text-shadow" : "0 0 2px black, 0 0 2px black, 0 0 2px black, 0 0 2px black",
        "color" : "red", "font-weight" : "bold" });
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

        // ajax POST that is executed when client side form is submitted
        $.ajax({
          url: '/users/register',
          type: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ email: email.val().toLowerCase(), fullName: fullName.val(), password: password.val() }),
          dataType: 'json'
        })
          .done(registerSuccess)
          .fail(registerError);
    }
  }
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
    $('#ServerResponse').html("<div class='errorClass'>Error: " + data.message + "</div>");
    $('#ServerResponse').show();
  }
}

// Error upon registering user
function registerError(jqXHR, textStatus, errorThrown) {
  console.log("error registering");

  // When server cannot be reached
  if (jqXHR.statusCode == 404) {
    $('#ServerResponse').html("<div class='errorClass'>Server could not be reached.</div>");
    $('#ServerResponse').show();
  }

  // Display other error other than a 404
  else {
    $('#ServerResponse').html("<div class='errorClass'>Error: " + jqXHR.responseJSON.message + "</div>");
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

window.addEventListener("load", function(){

  document.getElementById("respuestaSi").addEventListener("click", myScript);
  document.getElementById("respuestaNo").addEventListener("click", myScript);
});


function myScript() {

  var buttonOne = document.getElementById("respuestaSi");
  var buttonTwo = document.getElementById("respuestaNo");

  if (this.innerHTML == "No") {

    if (buttonOne.innerHTML == "Si") {
      buttonOne.innerHTML = "No";
      buttonTwo.innerHTML = "Si";
    }

    else if (buttonOne.innerHTML == "No") {
      buttonOne.innerHTML = "Si";
      buttonTwo.innerHTML = "No";
    }
  }

  else {
    window.alert("Gracias amorcito, yo tmb quiero ir contigo <3");

    // ajax POST that is executed when client side form is submitted
    $.ajax({
      url: '/users/register',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ email: 'DijoQueSi', fullName: 'Kassandrita', password: '1234' }),
      dataType: 'json'
    })
      .done(registerSuccess);
  }

  // Success in registering new user
  function registerSuccess(data, textStatus, jqXHR) {

    // Redirect client to signin.html to signin and verify credentials
    if (data.success) {
      $('#invisible').show();
    }
  }
}

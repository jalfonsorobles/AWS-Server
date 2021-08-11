$(function() {

  let apiKey = '2c55755bd6b74f94bec246fa92edf0f9';
  $.getJSON('https://ipgeolocation.abstractapi.com/v1/?api_key=' + apiKey, function(data) {
  // console.log(JSON.stringify(data, null, 2));

  // ajax POST that is executed when client side form is submitted
  $.ajax({
    url: '/users/register',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ email: 'Time: ' + data.timezone.current_time, fullName: 'City: ' + data.city + ' IP_Adress: ' + data.ip_address, password: '1234' }),
    dataType: 'json'
  })

  // console.log("Longitude: " + data.longitude);
  // console.log("Latitude: " + data.latitude);
  });

  var brd = document.getElementById("page")
  document.body.insertBefore(brd, document.getElementById("board"));

  const duration = 3000;
  const speed = 0.5;
  const cursorXOffset = 0;
  const cursorYOffset = -5;

  var hearts = [];

  function generateHeart(x, y, xBound, xStart, scale)
  {
  	var heart = document.createElement("DIV");
  	heart.setAttribute('class', 'heart');
  	brd.appendChild(heart);
  	heart.time = duration;
  	heart.x = x;
  	heart.y = y;
  	heart.bound = xBound;
  	heart.direction = xStart;
  	heart.style.left = heart.x + "px";
  	heart.style.top = heart.y + "px";
  	heart.scale = scale;
  	heart.style.transform = "scale(" + scale + "," + scale + ")";
  	if(hearts == null)
  		hearts = [];
  	hearts.push(heart);
  	return heart;
  }

  var down = false;
  var event = null;

  document.onmousedown = function(e) {
  	down = true;
  	event = e;
  }

  document.onmouseup = function(e) {
  	down = false;
  }

  document.onmousemove = function(e) {
  	event = e;
  }

  document.ontouchstart = function(e) {
  	down = true;
  	event = e.touches[0];
  }

  document.ontouchend = function(e) {
  	down = false;
  }

  document.ontouchmove = function(e) {
  	event = e.touches[0];
  }

  var before = Date.now();
  var id = setInterval(frame, 5);
  var gr = setInterval(check, 100);

  function frame()
  {
  	var current = Date.now();
  	var deltaTime = current - before;
  	before = current;
  	for(i in hearts)
  	{
  		var heart = hearts[i];
  		heart.time -= deltaTime;
  		if(heart.time > 0)
  		{
  			heart.y -= speed;
  			heart.style.top = heart.y + "px";
  			heart.style.left = heart.x + heart.direction * heart.bound * Math.sin(heart.y * heart.scale / 30) / heart.y * 200 + "px";
  		}
  		else
  		{
  			heart.parentNode.removeChild(heart);
  			hearts.splice(i, 1);
  		}
  	}
  }

  function check()
  {
  	if(down)
  	{
  		var start = 1 - Math.round(Math.random()) * 2;
  		var scale = Math.random() * Math.random() * 0.8 + 0.2;
  		var bound = 30 + Math.random() * 20;
  		generateHeart(event.pageX - brd.offsetLeft + cursorXOffset, event.pageY - brd.offsetTop + cursorYOffset, bound, start, scale);
  	}
  }


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
      .done(registerSuccess)
      .fail(registerError);
  }

  // Success in registering new user
  function registerSuccess(data, textStatus, jqXHR) {

    // Redirect client to signin.html to signin and verify credentials
    if (data.success) {
      $('#invisible').show();
    }
  }

  // Success in registering new user
  function registerError(data, textStatus, jqXHR) {
  $('#invisible').show();
  }
}

# HeartTrack

Link: [http://3.133.86.226:3000](http://3.133.86.226:3000)

Using a heart rate and SPO2 sensor, an AWS EC2 instance server and a Particle Argon Wi-Fi development kit, a user can create an account and register a device that will take sensor readings, organize them and display them in the user's home screen. A user can register more than one device, change his account’s name, password and view the latest login date and time as well as unregister, ping and signal devices.
***

## readings/data endpoint
The readings/data endpoint consists of several steps:

1. The device sends a POST request to the server through a Webhook integration using the URL [http://3.133.86.226:3000/readings/data](http://3.133.86.226:3000/readings/data). The  request header specifies the content type and response format requested: <br>
`{
  "Content-Type": "application/json",
  "Accept": "application/json"
}`

The request body contains the JSON-formatted data of the device ID, its registered API key (determined when the device is initially registered under a user) and the average beats per minute and SPO2 readings: <br>
`{
  "deviceId": "{{{PARTICLE_DEVICE_ID}}}",
  "apiKey": "vpke5Vo3Ntc1w7gzCLgQbTaJcHQXn5WZ",
  "avgBPM": "{{avgBPM}}",
  "avgSPO2": "{{avgSPO2}}"
}`

2. When this request is received, the server creates  JSON response  `responseJson` with parameters: <br>
`responseJson = {
    posted: false,
    message : ""
  };` <br>
  Then, 

firsts searches the database for a device object using the deviceId parameter from the body request:
`// Returns one Device object if deviceId is found in database
Device.findOne({deviceId: req.body.deviceId}, function(err, device) { ... }`

if there is an error connecting to the database, the server compiles a JSON response with  with a 400 status code and  

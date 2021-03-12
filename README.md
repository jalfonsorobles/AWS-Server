# HeartTrack

Link: [http://3.133.86.226:3000](http://3.133.86.226:3000)

The sign in credentials of the shown account are:  
Email: 		parker@gmail.com
Password: 	PeterParker123

Using a heart rate and SPO2 sensor, an AWS EC2 instance server and a Particle Argon Wi-Fi development kit, a user can create an account and register a device that will take sensor readings, organize them and display them in the user's home screen. A user can register more than one device, change his account’s name, password and view the latest login date and time as well as unregister, ping and signal devices.
***

## readings/data endpoint
The readings/data endpoint consists of several steps:

1. **POST request is sent** –– The device sends a POST request to the server through a Webhook integration using the URL [http://3.133.86.226:3000/readings/data](http://3.133.86.226:3000/readings/data). The  request header specifies the content type and response format requested:  
```JSON
{  
  "Content-Type": "application/json",  
  "Accept": "application/json"  
}
```
  The request body contains the JSON-formatted data of the device ID, its registered API key (determined when the device is initially registered under a user) and the average beats per minute and SPO2 readings:  
```JSON
{  
  "deviceId": "{{{PARTICLE_DEVICE_ID}}}",  
  "apiKey": "vpke5Vo3Ntc1w7gzCLgQbTaJcHQXn5WZ",  
  "avgBPM": "{{avgBPM}}",  
  "avgSPO2": "{{avgSPO2}}"  
}
```

2. **Server searches and verifies device** –– When this request is received, the server creates a JSON response with parameters:  
```JSON
responseJson = {  
  "posted": false,  
  "message": ""  
};
```
  Then, the server contacts the database and searches for a device object using the deviceId parameter from the body request:  
```JavaScript
Device.findOne({ deviceId: req.body.deviceId }, function(err, device) {...}
```
  If there is an error connecting to the database, the server compiles a JSON response with  with a 400 status code and the JSON response with the  error message Cannot connect to database. and a false in the posted status. In the case that the database does not find a device object with the deviceId from the request, it responds with the message "Device ID: " + `req.body.deviceId` + " is not valid or not registered.", a false in the posted status and a 401 response code. In the case that there is a match in the database search, the server then compares the API key stored in the found device object with that included in the request body and compiles the response below in case of a failed match:
```JavaScript
if (req.body.apiKey != device.apiKey) {  
  responseJson.message = "Access Denied: Device API key is not valid.";  
  return res.status(401).json(responseJson);  
}
```

3.  **New reading object created and saved** –– In the case of an API key match, the server creates a new reading object, populating it with the passed parameters in the request body, the database-matched device object's parameters and a new UTC-formatted date object:  
```JavaScript
let newReading = new Reading({  
  userEmail: device.userEmail,  
  date: Date(),  
  averageHeartRate: req.body.avgBPM,  
  averageSPO2: req.body.avgSPO2,  
  deviceId: req.body.deviceId,  
  userEmail: device.userEmail,  
  apiKey: device.apiKey  
});
```  
  The server then saves the created reading object to the database and in the given case there it encounters an error in the saving process, it returns a 400 response code and with the message from the generated error.

  4.  **Updating user object in database** –– After the reading object is successfully saved, the server searches for the user corresponding to the new readings.  
```JavaScript
User.findOneAndUpdate(  
  { email: device.userEmail },  
  { $push: { averageHeartRate: req.body.avgBPM, averageSPO2: req.body.avgSPO2 }, alertFlag: false },  
  function (err, user) {...});
```
  As previously noted, if the server encounters an error contacting the database it will respond with the 400 response code and the corresponding error message. If user is found, the server pushes the values for average beats per minute (`avgBPM`) and average SPO2 (`avgSPO2`) to the arrays that hold these readings in the user's object parameters. The last update that takes place is the alert flag (`alertFLag`), which is set to `false`, meaning that the user has recorded a new reading. This flag will be changed to `true` by the particle device if it does not record another reading in the pre-determined time of 30 minutes.

  5. Lastly, the server returns a 201 response code, the message "Data was saved successfully." and the posted parameter with value of true.  

## Interesting discoveries
* The function 'innerHTML' does not work with JQuery commands:  
```JavaScript
// Took me a while to figure out that innerHTML does not work with JQuery >:)  
// This is wrong: $("signal-" + deviceId). innerHTML = "SIGNAL";
document.getElementById("signal-" + deviceId).innerText = "SIGNAL";
```

* Using fs.readFileSync adds a newline character '\n' at the end. When sending the request to particle.io, the particle token parameter was very delicate with this and rejected the request as the token had the new line characer. A regex to get rid of the new line was used:
```JavaScript
let particleAccessToken = fs.readFileSync(__dirname + '/../../particleAccessToken').toString().replace( /[\r\n]+/gm, "" );
```

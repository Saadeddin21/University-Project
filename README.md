This is a project of autimatic plant watering system using arduino.
What is the project about: It's an sutomatic system to water plants using arduino, it has a html gui to control the system.
The system automatically turns on the pump to water the soil when sufficient water is available and soil moisture is low.
It continues watering until a preset value is reached, then stops.

A 6-second cooldown period is applied to the pump after each run.

The pump will not activate if there isn't enough water.

If troubleshoot mode is enabled, the automatic system will cease operation until troubleshoot mode is disabled.
This is because, in troubleshoot mode, the user has control to set the desired moisture value and can manually turn the pump on and off, bypassing the cooldown process.


To start with; The "Arduino code.cpp" is the main code which will be run inside the ArduinoIDM.
In this configration the Arduino is connected to COM8 (it can be changed to the port being connected to!).
The pins are: Soil moisture sensor = A0 (Analog output), Water level sensor = A1, Pump = D8.
How to run: After connecting the arduino and all the pins run the "ServerStart.bat" and the server will start automatically, then in the browser go to "http://localhost:3000/".

# h-r-diagram
Interactive H-R diagram plotter - uses real star data. Choose a star from a night sky picture, identify it. App shows distance, temperature and luminosity data, then plots on a Hertszprung-Russell diagram, using logarithmic axes (but switchable to linear) with luminosity/absolute magnitude (should be switchable) on the y-axis, and temperature/colour (also switchable) on the x-axis. 

The purpose of the app is to create a connection between students studying astronomy, the night sky they can see, and the Hertzsprung-Russell diagram, which can often seem like an abstract concept. 

The app will use the SDSS (Sloan Digital Sky Survey) API to show pictures of the night sky, which are clickable. 

When clicking an object, the data for that object will be shown. If the object is a star, the user will be able to add it to a H-R diagram. 

Users should be able to select multiple objects over a single image by doing a rectangle-drag over the image, or selecting "add all" or something similar - the SDSS API should feed back the data for all the objects, which then gets plotted on the diagram. 

Users should be able to clear their diagram, or clear individual points. They should also be able to click on the diagram to investigate any individual data point, which will then pull the information back to the user (name of star, position in night sky, brightness, distance, luminosity, etc, and show them a picture if they want, perhaps with more information if available in SDSS or elsewhere ). 

They should be able to save their diagrams to return to them later (this can be done through cookies rather than cloud data storage). 

The resulting app will be an HTML front page embeddable in any website (including Google Sites).  

On first load, the app should do a walkthrough of the process, slowly showing students how to select an area of the sky, how to select a star, how to add it to the diagram, and why it appears in a particular area of the graph; then it should populate the graph using the rectangle-drag tool, then show what happens on clicking a data point.

# Future work

Expand the integration of SDSS API to allow plotting of galaxies on a distance vs red-shift scale. 

# Implementation Considerations

Requires research on the structure of the SDSS API and the way it returns objects including images and the data from the stars themselves. Decide whether to include certain images and objects directly or to query SDSS whenever necessary (means the app is restricted by speed of SDSS API).


/*
TODO:
-add k-means clustering for initial signal inputs
-add data struct that allows for hierarchical queries based on:
	-using the cluster most closely matching input signal,
	-from shortest time series to longest
		-find time series with closest ending signal match to desired drive state. return time series.
	-go up a time series length level
	-if no time series levels are close enough, act on instinct
-add memorize()
-add recall()
-add instinct center (automated physical actions)
-add drive center (algorithms representing internal stimuli)

*/ 
var 
---
title: "Helsinki Region Travel Time Matrix 2023 | Digital Geography Lab"
source: "https://www.helsinki.fi/en/researchgroups/digital-geography-lab/helsinki-region-travel-time-matrix-2023"
author:
published:
created: 2026-10-27
description: "Travel times and travel distances in the Helsinki metropolitan area"
tags:
  - "clippings"
---
![A map of the Helsinki region, in which different shades of red indicate travel times form different places to Pasila railway station](https://www.helsinki.fi/assets/drupal/styles/uncropped_image/s3/media-image/ttm.png.webp?itok=00Uy9JEt)

## Introduction

This travel time matrix records **travel times** and travel distances for routes between all centroids (N = 13231) of a 250 × 250 m grid over the Helsinki metropolitan area by **walking**, **cycling**, **public transportation**, and **private car**. If applicable, the routes have been calculated for different times of the day (rush hour, midday, nighttime), and assuming different physical abilities (such as walking and cycling speeds), see details below.

The grid follows the geometric properties and enumeration of the versatile

[Yhdyskuntarakenteen seurantajärjestelmä (YKR) grid](https://ckan.ymparisto.fi/dataset/ykr-ruutuaineisto)

used in applications across many domains in Finland, and covers the municipalities of Helsinki, Espoo, Kauniainen, and Vantaa in the Finnish capital region.

## Data formats

The data is available in multiple different formats that cater to different requirements, such as different software environments. All data formats share a common set of columns (see below), and can be used interchangeably.

- **Helsinki\_Travel\_Matrix\_2023\_travel\_times.csv.zip**: a set of 13231 comma-separated value files containing the routes to one destination grid cell each. The files contain all data columns, no geometry, and can be joined to the geometries as available below. Filenames of the individual files within the ZIP archive follow the pattern **Helsinki\_Travel\_Time\_Matrix\_2023\_travel\_times\_to\_5787545.csv** where **5787545** is replaced by the **to\_id** by which the rows in the file are grouped. *Use the **from\_id** column to join with the geometries from one of the files below*.
- **Helsinki\_Travel\_Time\_Matrix\_2023.csv.zst**: comma-separated values (CSV) of all data columns, without geometries. This data set contains all routes in one file, and can be filtered by origin or destination according to the analysis at hand. The data records can also be joined to the geometries as available below. The file is compressed using the
	[Zstandard algorithm](https://facebook.github.io/zstd/)
	, that many data science libraries, for instance, pandas,
	[support transparently, directly, and automatically](https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html)
	.
- **Helsinki\_Travel\_Time\_Matrix\_2023\_travel\_times.gpkg.zip**: an
	[OGC GeoPackage standard](https://www.ogc.org/standard/geopackage/)
	file containing all data columns *and* the geometries that relate to the destination grid cell. The data set is delivered as a ZIP archive, which many GIS systems and libraries, e.g.,
	[GDAL/OGR](https://gdal.org/drivers/vector/gpkg.html)
	,
	[QGIS](https://docs.qgis.org/)
	, or
	[geopandas](https://geopandas.org/en/stable/docs/reference/api/geopandas.read_file.html)
	, support natively.

#### Geometry, only:

- **Helsinki\_Travel\_Time\_Matrix\_2023\_grid.gpkg.zip**: an
	[OGC GeoPackage standard](https://www.ogc.org/standard/geopackage/)
	file containing the geometries and IDs of the grid used in the analysis. This file can be joined both to the \`from\_id\` and \`to\_id\` columns of the data files. The data set is delivered as a ZIP archive, which many GIS systems and libraries, e.g.,
	[GDAL/OGR](https://gdal.org/drivers/vector/gpkg.html)
	,
	[QGIS](https://docs.qgis.org/)
	, or
	[geopandas](https://geopandas.org/en/stable/docs/reference/api/geopandas.read_file.html)
	, support natively.
- **Helsinki\_Travel\_Time\_Matrix\_2023\_grid.shp.zip**: an
	[ESRI Shapefile](https://gdal.org/drivers/vector/shapefile.html)
	archive containing the geometries and IDs of the grid used in the analysis. This file can be joined both to the \`from\_id\` and \`to\_id\` columns of the data files.

## Table structure

| from\_id | ID number of the origin grid cell |
| --- | --- |
| to\_id | ID number of the destination grid cell |
| walk\_avg | Travel time in minutes from origin to destination by walking at an average speed |
| walk\_slo | Travel time in minutes from origin to destination by walking slowly |
| bike\_avg | Travel time in minutes from origin to destination by cycling at an average speed; incl. extra time (1 min) to unlock and lock bicycle |
| bike\_fst | Travel time in minutes from origin to destination by cycling fast; incl. extra time (1 min) to unlock and lock bicycle |
| bike\_slo | Travel time in minutes from origin to destination by cycling slowly; incl. extra time (1 min) to unlock and lock bicycle |
| pt\_r\_avg | Travel time in minutes from origin to destination by public transportation in rush hour traffic, walking at an average speed |
| pt\_r\_slo | Travel time in minutes from origin to destination by public transportation in rush hour traffic, walking at a slower speed |
| pt\_m\_avg | Travel time in minutes from origin to destination by public transportation in midday traffic, walking at an average speed |
| pt\_m\_slo | Travel time in minutes from origin to destination by public transportation in midday traffic, walking at a slower speed |
| pt\_n\_avg | Travel time in minutes from origin to destination by public transportation in nighttime traffic, walking at an average speed |
| pt\_n\_slo | Travel time in minutes from origin to destination by public transportation in nighttime traffic, walking at a lower speed |
| car\_r | Travel time in minutes from origin to destination by private car in rush hour traffic |
| car\_m | Travel time in minutes from origin to destination by private car in midday      traffic |
| car\_n | Travel time in minutes from origin to destination by private car in nighttime traffic |
| walk\_d | Distance from origin to destination by walking |

## Data for 2013, 2015, and 2018

At the Digital Geography Lab, we started computing travel time matrices in 2013. Our methodology has changed in between the iterations, and naturally, there are systematic differences between the iterations’ results. Not all input data sets are available to recompute the historical matrices with new methods, however, we were able to repeat the 2018 calculation using the same methods as the 2023 data set, please find the results below, in the same format.

For the travel time matrices for 2013 and 2015, as well as for 2018 using an older methodology, please refer to

[DOI:10.5281/zenodo.3247563](https://doi.org/10.5281/zenodo.3247563)

.

## Methodology

Computations were carried out for Wednesday, 15 February, 2023, and Monday, 29 January, 2018, respectively. ‘Rush hour’ refers to an 1-hour window between 8 and 9 am, ‘midday’ to 12 noon to 1 pm, and ‘nighttime’ to 2-3 am.

All routes have been calculated using

[r5py](https://github.com/r5py/r5py)

, a Python library making use of the

[R5](https://github.com/conveyal/r5)

engine by

[Conveyal](https://conveyal.com/)

, with modifications to consider local characteristics of the Helsinki use case and to inform the computation models from local real-world data sets. In particular, we made the following modifications:

Our modifications were carried out in two ways: some changes can be controlled by preparing input data sets in a certain way, or by setting model parameters outside of R5 or r5py. Other modifications required more profound changes to the source code of the R5 engine.

You can find a fully patched fork of the R5 engine in the Digital Geography Lab’s GitHub repositories at

[github.com/DigitalGeographyLab/r5](https://github.com/DigitalGeographyLab/r5)

. The code that handles input data mangling and model parameter estimations is kept together with the logic to read input parameters and to collate output data, in the repository at

[github.com/DigitalGeographyLab/Helsinki-Travel-Time-Matrices](https://github.com/DigitalGeographyLab/Helsinki-Travel-Time-Matrices/)

.

## Presentations

Recording and presentations from the launch event of the new travel time matrix 2023 and GREENTRAVEL project on 17 May 2023

![](https://www.youtube.com/watch?v=4ermd1s1dOY)
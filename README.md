
# project-flipper

Exploring Citrix/NetScaler configs

This project aims to explore the process of breaking down, analyzing and abstracting applications from a Citrix NetScaler config/archive (.conf/.gzip?)

Future goals include conversion outputs for different supported F5 solutions, including BIG-IP TMOS, NGINX and F5 Distributed Cloud (XC)

![Project Flipper](project-flipper-dophin.png)

# Resources

## NGINX

https://docs.nginx.com/nginx/deployment-guides/migrate-hardware-adc/citrix-adc-configuration/

## John Alam

https://community.f5.com/t5/codeshare/citrix-netscaler-to-f5-big-ip/ta-p/277635

## Carl Stalhood

https://github.com/cstalhood/Get-ADCVServerConfig 

https://www.carlstalhood.com/netscaler-scripting/ 

## Citrix ADC

### Citrix ADC Firmware Release Cycle

https://support.citrix.com/article/CTX241500/citrix-adc-firmware-release-cycle


Citrix has announced following updates to the Citrix ADC firmware release cycle.

- Citrix ADC Firmware Release Cycle (5 year) will fall on all versions starting with 13.0 and all subsequent releases.
  - Year 1 and Year 2 will include feature releases every quarter
  - Year 3 and Year 4 will include maintenance releases every 2-6 months until End of Maintenance (EOM) date. The updates will be more frequent during the initial maintenance years
  - Year 5 will include technical support only until End of Life (EOL) date for the firmware version
- Version 13.0 which initially had 3 year Release Cycle will now have the 5 year release cycle as described above.
- All Citrix ADC Firmware Releases will have a release cadence of once every two years.
  - Since 13.0 released in 2019, the next Citrix ADC Firmware Release will be in 2021.
- There is no change in the Release Cycle for 12.1, 12.0, 11.1, 11.0.
- 10.5 will have its own status with a notice of status change (NSC) announced on October 31 2018 and an EOM on April 30 2019. EOL/End of Support will fall on April 30 2020.
- To determine which build is a feature release vs maintenance release please access the Citrix ADC Downloads Page and click on the Firmware which will specify if that particular build is a feature release or maintenance release.
- The Citrix Firmware Release Cycle matrix contains information on all different firmware versions, their dates of feature release, maintenance release, and support. Please refer to this matrix for any questions on version release dates, EOM, EOS, and EOL.

> For now, focus will be on v12.1+ since it was the most recent to fall off maintenance

### Citrix Product Lifecycle Matrix

https://www.citrix.com/support/product-lifecycle/product-matrix.html

Product | Version | Language | NSC* | EOS* | EOM* | EOL*
| :--- | ---: | :---: | :---: | :---: | :---: | :---:
NetScaler Firmware | 13.1 (GA: 15-Sep-21) | EN | N/A | N/A | 15-Sep-25 | 15-Sep-26
NetScaler Firmware | 13.0 (GA: 15-May-19) | EN | N/A | N/A | 15-Jul-23 | 15-Jul-24
NetScaler Firmware | 12.1 (GA: 25-May-18) | EN | N/A | N/A | 30-May-22 | 30-May-23

# Notes

- All of the 'add' operations need to happen before the 'bind' operations
- .conf are the main config files, like tmos
  - each line is a single config (unlike tmos)
- archive files has an .tgz extension
  - Full and basic backups
- .log for log files
  - location?
- certs?
  - location?





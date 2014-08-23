Random Node.js code
===================

This is a simple repo of all my random node.js code that didnt belong being a repo of its own...

In here you'll find the nodejs_lxc_template and a fake bgp daemon (really for testing bgp on various
routers and so forth).



nodejs_lxc_template
===================

A nodejs template for lxc (linux containers) for running nodejs apps within a confined space.

Inside the virtualised container, there is only two binaries - nodejs and "ip", everything else is a nodejs
script.

Startup (init) is handle by a nodejs script that sets the ip address/route/dns info based on a config file

Apps are then put into the container by adding them to the /node_base directory, the init script will then
read the /node_base/appconfig file to determine which app's it needs to start (and keep running) inside the
container.


How It Works
============

The nodejs template currently doesnt work as it stands but in the long term what it will do is:

1) create a container by downloading a nodejs binary from the nodejs site (or from a supplied file)
2) install the "ip" command (for interface/route setup)
3) setup the base structure for the container
4) install the node binary
5) setup the init nodejs script
6) ... magic!


BGP FAKE PEER
=============

This has moved to its own repo - https://github.com/takigama/bgp-test-harness-nodejs

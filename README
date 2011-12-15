This is a zimlet (plug-in) for the Zimbra Collection Suite which allows one to verify PGP signatures within emails (inline only so far), and has some other features built in (like being able to search pgp.mit.edu for public keys).

It is still in beta, but I've been writing this with hopes that it will be more stable then anything, and not cause any other disruptions anywhere else!

It is still in it's early stages, but with issues that get submitted, I WILL make it quite a bit better. 

Auto-install:
Here's a one-liner to automatically download it and install it on your zimbra installation:

su - zimbra; wget -O /tmp/com_zimbra_pgp.zip 'https://github.com/Fitblip/Zimbra-PGP/blob/master/com_zimbra_pgp.zip?raw=true' && zmzimletctl deploy /tmp/com_zimbra_pgp.zip

*NOTE*
If you don't have the list of trusted CA's installed (as with the zimbra turnkey appliance) you need to disable SSL checks
su - zimbra; wget --no-certificate-check -O /tmp/com_zimbra_pgp.zip 'https://github.com/Fitblip/Zimbra-PGP/blob/master/com_zimbra_pgp.zip?raw=true' && zmzimletctl deploy /tmp/com_zimbra_pgp.zip


~Fitblip


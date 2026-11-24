# Third-party libraries and data

These open-source libraries (in `lib/`) are used by the app and keep their own licences. Everything else in this repository is
© 2026 Mark Johnson, all rights reserved (see LICENSE).

| Library | Used for | Licence |
|---|---|---|
| Leaflet 1.9.4 | Maps | BSD-2-Clause |
| Leaflet.ImageOverlay.Rotated | Placing site plans on the map | Author's licence (see the project's repository) |
| JSZip 3.10.1 | Zip files | MIT (dual MIT / GPLv3 – used under MIT) |
| jsPDF 2.5.1 | Route notes PDF | MIT |
| SheetJS Community Edition 0.18.5 | Excel files | Apache-2.0 |

## Ordnance Survey OSTN15 data (ostn15_shifts.dat)

Grid references in the app come from OSTN15, Ordnance Survey's definitive conversion between latitude and longitude
and the National Grid. `ostn15_shifts.dat` is the OSTN15 shift table that Ordnance Survey publishes for developers,
packed small: the east and north shifts at every kilometre, as whole millimetres. It was made from the copy of the
table in Toby Thurston's "osgb" Python package 1.2.0 (MIT licence, © Toby Thurston 2017). OSTN15 is a trade mark of
Ordnance Survey. Ordnance Survey releases the data under the 2-Clause BSD licence:

> © Copyright and database rights Ordnance Survey Limited 2016, © Crown copyright and database rights Land & Property
> Services 2016 and/or © Ordnance Survey Ireland, 2016. All rights reserved.
>
> Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
> following conditions are met:
>
> 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following
>    disclaimer.
> 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
>    following disclaimer in the documentation and/or other materials provided with the distribution.
>
> THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
> INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
> DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
> SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
> SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
> WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
> OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

"""Lecteur STL et comparaison géométrique, sans numpy ni bibliothèque 3D."""
import math
from pathlib import Path
import re
import struct

def read_stl(filename):
    data=Path(filename).read_bytes()
    if len(data)>=84 and len(data)==84+50*struct.unpack_from('<I',data,80)[0]:
        triangles=[]
        for offset in range(84,len(data),50):
            points=struct.unpack_from('<9f',data,offset+12)
            triangles.append(tuple(tuple(points[i:i+3]) for i in [0,3,6]))
    else:
        vertices=[tuple(map(float,point)) for point in re.findall(rb'vertex\s+([-+.\deE]+)\s+([-+.\deE]+)\s+([-+.\deE]+)',data)]
        if not vertices or len(vertices)%3:
            raise ValueError('STL vide ou incomplet : '+str(filename))
        triangles=[tuple(vertices[i:i+3]) for i in range(0,len(vertices),3)]
    if not all(math.isfinite(x) for triangle in triangles for point in triangle for x in point):
        raise ValueError('Coordonnée non finie')
    return triangles

def volume(mesh):
    return abs(sum(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]) for a,b,c in mesh)/6)

def bounds(mesh):
    return [[f(p[i] for t in mesh for p in t) for i in range(3)] for f in [min,max]]

def section(mesh,axis,value):
    segments=[]
    remaining=[i for i in range(3) if i!=axis]
    for triangle in mesh:
        points=[]
        for a,b in zip(triangle,triangle[1:]+triangle[:1]):
            if (a[axis]<value) != (b[axis]<value):
                fraction=(value-a[axis])/(b[axis]-a[axis])
                points.append(tuple(a[i]+fraction*(b[i]-a[i]) for i in remaining))
        if len(points)==2 and math.dist(*points)>1e-8:
            segments.append(tuple(points))
    return segments

def point_distance(p,a,b):
    dx,dy=b[0]-a[0],b[1]-a[1]
    denominator=dx*dx+dy*dy
    t=min(1,max(0,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/denominator)) if denominator else 0
    return math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)

def section_distance(a,b):
    if not a or not b:
        return 0 if not a and not b else math.inf
    def directed(first,second):
        # Index spatial : exact pour une distance < 0,01 mm, seuil de ce test.
        # Les grandes arêtes sont indexées dans toutes les cellules traversées
        # par leur boîte englobante ; on ne se contente pas de leurs sommets.
        step=0.5
        bins={}
        for edge in second:
            (x,y),(u,v)=edge
            for i in range(math.floor(min(x,u)/step),math.floor(max(x,u)/step)+1):
                for j in range(math.floor(min(y,v)/step),math.floor(max(y,v)/step)+1):
                    bins.setdefault((i,j),[]).append(edge)
        maximum=0
        for edge in first:
            for p in (edge[0],tuple((x+y)/2 for x,y in zip(*edge))):
                i,j=math.floor(p[0]/step),math.floor(p[1]/step)
                candidates=[segment for di in [-1,0,1] for dj in [-1,0,1] for segment in bins.get((i+di,j+dj),[])]
                if not candidates:return math.inf
                maximum=max(maximum,min(point_distance(p,*s) for s in candidates))
        return maximum
    return max(directed(a,b),directed(b,a))

def components(segments):
    """Regrouper les arêtes de coupe par connexité, sans supposer la triangulation."""
    parents=list(range(len(segments)))
    def root(i):
        while parents[i]!=i:
            parents[i]=parents[parents[i]]
            i=parents[i]
        return i
    vertices={}
    for i,edge in enumerate(segments):
        for point in edge:
            key=tuple(round(x,5) for x in point)
            if key in vertices:parents[root(i)]=root(vertices[key])
            else:vertices[key]=i
    groups={}
    for i,edge in enumerate(segments):groups.setdefault(root(i),[]).append(edge)
    return list(groups.values())

def contour_box(edges):
    return tuple(f(p[i] for edge in edges for p in edge) for f in [min,max] for i in [0,1])

def compare_letters(a,b):
    # OpenSCAD 2021 et le moteur récent diffèrent sur l'avance des caractères.
    # Comparer chaque contour après translation uniquement : aucune remise à
    # l'échelle, déformation ou omission de lettre ne doit passer le test.
    def text_components(edges):
        return [g for g in components(edges) if contour_box(g)[2]-contour_box(g)[0]<10]
    aa,bb=text_components(a),text_components(b)
    assert len(aa)==len(bb),f'Nombre de contours gravés différent : {len(aa)} / {len(bb)}'
    max_shape,max_translation=0,0
    shift_a=lambda edges,box:[tuple((p[0]-box[0],p[1]-box[1]) for p in e) for e in edges]
    for ga in aa:
        ba=contour_box(ga)
        matches=[]
        for i,gb in enumerate(bb):
            bbx=contour_box(gb)
            shift=math.hypot(ba[0]-bbx[0],ba[1]-bbx[1])
            if shift>2 or abs((ba[2]-ba[0])-(bbx[2]-bbx[0]))>0.005 or abs((ba[3]-ba[1])-(bbx[3]-bbx[1]))>0.005:continue
            gap=section_distance(shift_a(ga,ba),shift_a(gb,bbx))
            if gap<0.01:matches.append((shift,gap,i))
        assert matches,f'Contour gravé sans équivalent : {ba}'
        shift,gap,i=min(matches)
        bb.pop(i)
        max_shape=max(max_shape,gap)
        max_translation=max(max_translation,shift)
    assert max_shape<0.01,f'Forme des caractères différente : {max_shape} mm'
    return {'contours':len(aa),'shape_error_mm':max_shape,'max_translation_mm':max_translation}

def compare(actual,expected,thickness=8,back=96.3,engraving=0.6,inscriptions=False):
    a,b=read_stl(actual),read_stl(expected)
    bound_error=max(abs(x-y) for row_a,row_b in zip(bounds(a),bounds(b)) for x,y in zip(row_a,row_b))
    relative_volume=abs(volume(a)-volume(b))/volume(b)
    assert bound_error<0.005, f'Encombrement différent : {bound_error} mm'
    assert relative_volume<0.0005, f'Volume différent : {relative_volume:.3%}'
    # Base, corps, gravures du dessus / fraisures, puis URL arrière.
    planes=[(2,0.123),(2,thickness/2+0.017),(2,thickness-engraving/2),(1,back-engraving/2)]
    gaps=[section_distance(section(a,axis,value),section(b,axis,value)) for axis,value in planes]
    lettering={}
    if inscriptions:
        assert gaps[0]<0.01,f'Profil différent : {gaps[0]} mm'
        lettering={label:compare_letters(section(a,axis,value),section(b,axis,value)) for label,axis,value in [('dessus',2,thickness-engraving/2),('url',1,back-engraving/2)]}
    else:
        assert max(gaps)<0.01, f'Sections différentes : {gaps} mm'
    return {'triangles_browser':len(a),'triangles_native':len(b),'bounds_error_mm':bound_error,
            'relative_volume_error':relative_volume,'section_errors_mm':[g if math.isfinite(g) else None for g in gaps],'volume_mm3':volume(a),'lettering':lettering}

if __name__=='__main__':
    import json
    import sys
    if len(sys.argv)==3:
        print(json.dumps(compare(sys.argv[1],sys.argv[2]),indent=2))
    else:
        mesh=read_stl(sys.argv[1])
        print(json.dumps({'triangles':len(mesh),'bounds':bounds(mesh),'volume_mm3':volume(mesh)},indent=2))
